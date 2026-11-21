import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../src/app.js';
import {
  validateDrinkItem,
  validateOrder,
  validateFulfillment,
  calculateOrderTotals,
  formatCurrency,
  generateReceiptNumber,
  generateHmacSignature,
  verifyHmacSignature,
  FULFILLMENT_MODES,
  ORDER_STATUS,
  PAYMENT_STATUS,
  DEFAULT_WEBHOOK_SECRET,
} from '@milky-shakes/shared';

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('Milky Shakes Drinks Custom Order Placement (FR-002)', () => {
  describe('Shared Validation & Price Calculation', () => {
    it('validates a complete drink item successfully', () => {
      const drink = { flavourId: 'f1', consistencyId: 'c1', toppingId: 't1' };
      const errors = validateDrinkItem(drink, 0);
      assert.strictEqual(errors.length, 0);
    });

    it('rejects an incomplete drink item missing flavour or consistency', () => {
      const incomplete = { flavourId: '', consistencyId: 'c1', toppingId: '' };
      const errors = validateDrinkItem(incomplete, 0);
      assert.ok(errors.some((e) => e.includes('Flavour')));
      assert.ok(errors.some((e) => e.includes('Topping')));
    });

    it('calculates order totals accurately matching wireframe example', () => {
      // 2 drinks with subtotal R84.99
      const drinks = [{ cost: 42.50 }, { cost: 42.49 }];
      const totals = calculateOrderTotals(drinks, null, 0.15);

      assert.strictEqual(totals.subtotal, 84.99);
      assert.strictEqual(totals.vat, 12.75); // 84.99 * 0.15 = 12.7485 -> 12.75
      assert.strictEqual(totals.total, 97.74);
      assert.strictEqual(formatCurrency(totals.subtotal), 'R84.99');
    });

    it('applies percentage discount correctly', () => {
      const drinks = [{ cost: 100.00 }];
      const discountTier = { code: 'FREQUENT10', discount_percent: 10 };
      const totals = calculateOrderTotals(drinks, discountTier, 0.15);

      assert.strictEqual(totals.subtotal, 100.00);
      assert.strictEqual(totals.vat, 15.00);
      assert.strictEqual(totals.discountAmount, 10.00);
      assert.strictEqual(totals.total, 105.00); // 100 + 15 - 10
    });
  });

  describe('API Endpoints', () => {
    it('POST /api/orders/calculate returns calculated breakdown', async () => {
      const res = await fetch(`${baseUrl}/api/orders/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drinks: [{ cost: 35.00 }, { cost: 40.00 }],
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.subtotal, 75.00);
      assert.strictEqual(data.vat, 11.25);
      assert.strictEqual(data.total, 86.25);
    });

    it('POST /api/orders rejects invalid order with 0 drinks', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orders: { drinks: [] },
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.details.some((d) => d.includes('must contain between 1 and 10 drinks')));
    });

    it('POST /api/orders creates order successfully when data is valid', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-user-id',
          orders: {
            drinks: [
              { flavourId: 'f1', consistencyId: 'c1', toppingId: 't1', cost: 45.00 },
              { flavourId: 'f2', consistencyId: 'c2', toppingId: 't2', cost: 40.00 },
            ],
          },
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.orders.drinksCount, 2);
      assert.strictEqual(data.orders.subtotal, 85.00);
      assert.strictEqual(data.orders.status, 'PENDING_PAYMENT');
      assert.ok(data.orders.id);
    });

    it('POST /api/orders creates order with Store Pickup fulfillment', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-user-id',
          orders: {
            fulfillment: {
              mode: FULFILLMENT_MODES.PICKUP,
              restaurantId: 'rest-uuid-1',
              pickupTime: '2026-11-21T12:00:00Z',
            },
            drinks: [
              { flavourId: 'f1', consistencyId: 'c1', toppingId: 't1', cost: 40.00 },
            ],
          },
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.orders.fulfillment.mode, 'PICKUP');
      assert.strictEqual(data.orders.fulfillment.restaurantId, 'rest-uuid-1');
    });

    it('POST /api/orders creates order with Home Delivery fulfillment', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-user-id',
          orders: {
            fulfillment: {
              mode: FULFILLMENT_MODES.DELIVERY,
              streetAddress: '10 Ocean View Way',
              postalCode: '8001',
              recipientPhone: '+27821234567',
              deliveryInstructions: 'Leave with concierge',
            },
            drinks: [
              { flavourId: 'f1', consistencyId: 'c1', toppingId: 't1', cost: 45.00 },
            ],
          },
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.orders.fulfillment.mode, 'DELIVERY');
      assert.strictEqual(data.orders.fulfillment.streetAddress, '10 Ocean View Way');
      assert.strictEqual(data.orders.fulfillment.postalCode, '8001');
    });

    it('POST /api/orders rejects Delivery missing street address or postal code (AC-FR-003.2)', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-user-id',
          orders: {
            fulfillment: {
              mode: FULFILLMENT_MODES.DELIVERY,
              streetAddress: '',
              postalCode: '',
              recipientPhone: '',
            },
            drinks: [
              { flavourId: 'f1', consistencyId: 'c1', toppingId: 't1', cost: 45.00 },
            ],
          },
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.details.some((d) => d.includes('Street address is required')));
      assert.ok(data.details.some((d) => d.includes('Postal code is required')));
      assert.ok(data.details.some((d) => d.includes('Recipient contact phone number is required')));
    });
  });

  describe('Fulfillment Mode Validation Rules (FR-003 / AC-FR-003.2)', () => {
    it('validates a complete Store Pickup configuration', () => {
      const fulfillment = {
        mode: FULFILLMENT_MODES.PICKUP,
        restaurantId: 'rest-123',
        pickupTime: '2026-11-21T15:00:00Z',
      };
      const errors = validateFulfillment(fulfillment);
      assert.strictEqual(errors.length, 0);
    });

    it('rejects Store Pickup missing store location or pickup time', () => {
      const fulfillment = {
        mode: FULFILLMENT_MODES.PICKUP,
        restaurantId: '',
        pickupTime: '',
      };
      const errors = validateFulfillment(fulfillment);
      assert.ok(errors.some((e) => e.includes('Store location is required')));
      assert.ok(errors.some((e) => e.includes('Estimated pickup time slot is required')));
    });

    it('validates a complete Home Delivery configuration', () => {
      const fulfillment = {
        mode: FULFILLMENT_MODES.DELIVERY,
        streetAddress: '123 Shake Boulevard',
        postalCode: '8001',
        recipientPhone: '+27 21 555 0123',
        deliveryInstructions: 'Ring doorbell twice',
      };
      const errors = validateFulfillment(fulfillment);
      assert.strictEqual(errors.length, 0);
    });

    it('rejects Home Delivery missing required address, postal code, or phone', () => {
      const incomplete = {
        mode: FULFILLMENT_MODES.DELIVERY,
        streetAddress: '   ',
        postalCode: '',
        recipientPhone: '',
      };
      const errors = validateFulfillment(incomplete);
      assert.strictEqual(errors.length, 3);
      assert.ok(errors.some((e) => e.includes('Street address')));
      assert.ok(errors.some((e) => e.includes('Postal code')));
      assert.ok(errors.some((e) => e.includes('Recipient contact phone')));
    });
  });

  describe('Payment Processing & Receipt Generation (FR-004)', () => {
    let testOrderId;
    let testOrderNumber;

    before(async () => {
      // Create a test order in PENDING_PAYMENT state
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-patron-uuid',
          orders: {
            fulfillment: {
              mode: FULFILLMENT_MODES.PICKUP,
              restaurantId: 'rest-uuid',
              pickupTime: '2026-11-21T18:00:00Z',
            },
            drinks: [
              { flavourId: 'f1', consistencyId: 'c1', toppingId: 't1', cost: 45.00 },
            ],
          },
        }),
      });
      const data = await res.json();
      testOrderId = data.orders.id;
      testOrderNumber = data.orders.orderNumber;
    });

    it('POST /api/payments/checkout-session creates checkout session', async () => {
      const res = await fetch(`${baseUrl}/api/payments/checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: testOrderId,
          orderNumber: testOrderNumber,
          amount: 51.75,
          currency: 'ZAR',
          patronEmail: 'patron@example.com',
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.sessionId);
      assert.ok(data.transactionReference);
      assert.strictEqual(data.status, PAYMENT_STATUS.PENDING);
    });

    it('POST /api/webhooks/payment rejects invalid signature (AC-FR-004.1)', async () => {
      const payload = {
        event: 'payment.succeeded',
        transactionReference: 'txn_fake_sig',
        orderId: testOrderId,
        amount: 51.75,
      };

      const res = await fetch(`${baseUrl}/api/webhooks/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gateway-signature': 'invalid_signature_hex_123',
        },
        body: JSON.stringify(payload),
      });

      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.error, 'Invalid webhook signature');
    });

    it('POST /api/webhooks/payment marks failed payment and leaves order PENDING_PAYMENT with retry guidance (AC-FR-004.2)', async () => {
      const payload = {
        event: 'payment.failed',
        transactionReference: `txn_fail_${Date.now()}`,
        orderId: testOrderId,
        orderNumber: testOrderNumber,
        amount: 51.75,
      };

      const signature = await generateHmacSignature(payload, DEFAULT_WEBHOOK_SECRET);

      const res = await fetch(`${baseUrl}/api/webhooks/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gateway-signature': signature,
        },
        body: JSON.stringify(payload),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.status, PAYMENT_STATUS.FAILED);
      assert.strictEqual(data.orderStatus, ORDER_STATUS.PENDING_PAYMENT);
      assert.ok(data.retryGuidance);
    });

    it('POST /api/webhooks/payment processes successful payment, marks order PAID and returns receipt (AC-FR-004.1)', async () => {
      const txnRef = `txn_success_${Date.now()}`;
      const payload = {
        event: 'payment.succeeded',
        transactionReference: txnRef,
        orderId: testOrderId,
        orderNumber: testOrderNumber,
        amount: 51.75,
        paymentMethod: 'Visa ending in 4242',
      };

      const signature = await generateHmacSignature(payload, DEFAULT_WEBHOOK_SECRET);

      const res = await fetch(`${baseUrl}/api/webhooks/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gateway-signature': signature,
        },
        body: JSON.stringify(payload),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.status, ORDER_STATUS.PAID);
      assert.ok(data.receipt);
      assert.ok(data.receipt.receiptNumber.startsWith('RCP-'));
      assert.strictEqual(data.receipt.paymentStatus, ORDER_STATUS.PAID);
      assert.strictEqual(data.payment.status, PAYMENT_STATUS.SUCCESS);
    });

    it('POST /api/webhooks/payment is idempotent: duplicate callbacks do not duplicate payment or corrupt status (AC-FR-004.3)', async () => {
      const txnRef = `txn_idempotent_${Date.now()}`;
      const payload = {
        event: 'payment.succeeded',
        transactionReference: txnRef,
        orderId: testOrderId,
        orderNumber: testOrderNumber,
        amount: 51.75,
      };

      const signature = await generateHmacSignature(payload, DEFAULT_WEBHOOK_SECRET);

      // First webhook callback
      const firstRes = await fetch(`${baseUrl}/api/webhooks/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gateway-signature': signature,
        },
        body: JSON.stringify(payload),
      });
      assert.strictEqual(firstRes.status, 200);
      const firstData = await firstRes.json();
      assert.strictEqual(firstData.success, true);
      const firstReceiptNumber = firstData.receipt.receiptNumber;

      // Duplicate callback with same transaction reference
      const dupRes = await fetch(`${baseUrl}/api/webhooks/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gateway-signature': signature,
        },
        body: JSON.stringify(payload),
      });
      assert.strictEqual(dupRes.status, 200);
      const dupData = await dupRes.json();
      assert.strictEqual(dupData.success, true);
      assert.strictEqual(dupData.idempotent, true);
      assert.strictEqual(dupData.receipt.receiptNumber, firstReceiptNumber);
    });

    it('POST /api/payments/simulate interactive prototype flow works end-to-end', async () => {
      // Create another order for simulation
      const orderRes = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-patron-2',
          orders: {
            drinks: [
              { flavourId: 'f1', consistencyId: 'c1', toppingId: 't1', cost: 35.00 },
            ],
          },
        }),
      });
      const orderData = await orderRes.json();
      const simOrderId = orderData.orders.id;

      // Simulate payment success
      const simRes = await fetch(`${baseUrl}/api/payments/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: simOrderId,
          orderNumber: orderData.orders.orderNumber,
          amount: 40.25,
          outcome: 'SUCCESS',
        }),
      });

      assert.strictEqual(simRes.status, 200);
      const simData = await simRes.json();
      assert.strictEqual(simData.success, true);
      assert.strictEqual(simData.status, ORDER_STATUS.PAID);
      assert.ok(simData.receipt);

      // Verify GET /api/orders/:orderId/receipt retrieves the receipt
      const receiptRes = await fetch(`${baseUrl}/api/orders/${simOrderId}/receipt`);
      assert.strictEqual(receiptRes.status, 200);
      const receiptData = await receiptRes.json();
      assert.strictEqual(receiptData.receipt.orderId, simOrderId);
      assert.strictEqual(receiptData.receipt.receiptNumber, simData.receipt.receiptNumber);
    });
  });
});
