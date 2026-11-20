import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app from '../src/app.js';
import {
  validateDrinkItem,
  validateOrder,
  calculateOrderTotals,
  formatCurrency,
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
  });
});
