import express from 'express';
import cors from 'cors';
import {
  MIN_DRINKS_PER_ORDER,
  MAX_DRINKS_PER_ORDER,
  USER_ROLES,
  ORDER_STATUS,
  PAYMENT_STATUS,
  DEFAULT_DELIVERY_FEE,
  DEFAULT_WEBHOOK_SECRET,
  validateOrder,
  calculateOrderTotals,
  generateReceiptNumber,
  generateHmacSignature,
  verifyHmacSignature,
} from '@milky-shakes/shared';

const app = express();

// In-memory transactional stores for prototype testing & verification
export const ordersStore = new Map();
export const paymentsStore = new Map();
export const receiptsStore = new Map();

app.use(cors());
// Preserve raw body for HMAC signature verification
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'milky-shakes-api',
    platform: 'Vercel Serverless + Supabase',
    rules: {
      minDrinks: MIN_DRINKS_PER_ORDER,
      maxDrinks: MAX_DRINKS_PER_ORDER,
    },
    timestamp: new Date().toISOString(),
  });
});

// Authentication endpoints (supporting Login.jsx and SignUp.jsx prototypes)
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide both email and password.' });
  }

  // Prototype response
  res.json({
    success: true,
    user: {
      id: 'demo-user-123',
      email,
      role: USER_ROLES.PATRON,
    },
    token: 'mock-supabase-jwt-token',
  });
});

app.post('/api/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  res.status(201).json({
    success: true,
    user: {
      id: 'demo-user-new',
      name,
      email,
      role: USER_ROLES.PATRON,
    },
    message: 'Account successfully registered.',
  });
});

// Calculate order totals endpoint (FR-002: Authoritative server calculation)
app.post('/api/orders/calculate', (req, res) => {
  const { drinks, discountTier, vatRate, deliveryFee } = req.body;
  if (!Array.isArray(drinks)) {
    return res.status(400).json({ error: 'Drinks array is required' });
  }

  const totals = calculateOrderTotals(drinks, discountTier, vatRate, deliveryFee);
  res.json({ success: true, ...totals });
});

// Submit order endpoint
app.post('/api/orders', (req, res) => {
  const orderData = req.body.orders || req.body.order;
  const userId = req.body.userId;
  const validationErrors = validateOrder(orderData);

  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Order validation failed',
      details: validationErrors,
    });
  }

  const isDelivery = orderData.fulfillment?.mode === 'DELIVERY' || orderData.fulfillmentMode === 'DELIVERY';
  const deliveryFee = orderData.deliveryFee ?? (isDelivery ? DEFAULT_DELIVERY_FEE : 0);
  const totals = calculateOrderTotals(orderData.drinks, orderData.discountTier, orderData.vatRate, deliveryFee);
  const orderId = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Create verified order record
  const createdOrder = {
    id: orderId,
    orderNumber: orderData.orderNumber || `MSD-${Date.now().toString().slice(-6)}`,
    userId: userId || 'anonymous',
    status: ORDER_STATUS.PENDING_PAYMENT,
    fulfillment: orderData.fulfillment || {
      mode: orderData.fulfillmentMode || 'PICKUP',
      restaurantId: orderData.restaurantId,
      pickupTime: orderData.pickupTime,
    },
    drinksCount: orderData.drinks.length,
    drinks: orderData.drinks,
    subtotal: totals.subtotal,
    vat: totals.vat,
    discount: totals.discountAmount,
    deliveryFee: totals.deliveryFee,
    total: totals.total,
    createdAt: new Date().toISOString(),
  };

  ordersStore.set(orderId, createdOrder);

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    orders: createdOrder,
    order: createdOrder,
  });
});

// FR-004: Create payment checkout session
app.post('/api/payments/checkout-session', (req, res) => {
  const { orderId, orderNumber, amount, currency = 'ZAR', patronEmail } = req.body;

  if (!orderId || !amount) {
    return res.status(400).json({ error: 'orderId and amount are required' });
  }

  const sessionId = `cs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const transactionReference = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  res.json({
    success: true,
    sessionId,
    transactionReference,
    orderId,
    orderNumber,
    amount,
    currency,
    patronEmail,
    paymentGateway: 'STRIPE',
    status: PAYMENT_STATUS.PENDING,
    checkoutUrl: `https://checkout.milkyshakes.internal/pay/${sessionId}`,
  });
});

// FR-004: Payment Gateway Webhook Endpoint (AC-FR-004.1, AC-FR-004.2, AC-FR-004.3)
app.post('/api/webhooks/payment', async (req, res) => {
  const signature = req.headers['x-gateway-signature'];
  const rawBody = req.rawBody ? req.rawBody.toString('utf-8') : JSON.stringify(req.body);

  // 1. Verify webhook signature
  const isValid = await verifyHmacSignature(rawBody, signature, DEFAULT_WEBHOOK_SECRET);
  if (!isValid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid webhook signature',
    });
  }

  const {
    event,
    transactionReference,
    orderId,
    orderNumber,
    amount,
    currency = 'ZAR',
    paymentMethod = 'Visa ending in 4242',
    settledAt,
  } = req.body;

  if (!transactionReference || !orderId) {
    return res.status(400).json({ error: 'transactionReference and orderId are required' });
  }

  // 2. Idempotency Check (AC-FR-004.3): Duplicate gateway callbacks cannot duplicate payments or corrupt status
  if (paymentsStore.has(transactionReference)) {
    const existingPayment = paymentsStore.get(transactionReference);
    const existingReceipt = receiptsStore.get(orderId);
    return res.status(200).json({
      success: true,
      received: true,
      idempotent: true,
      message: 'Webhook callback already processed (idempotent)',
      payment: existingPayment,
      receipt: existingReceipt,
    });
  }

  // 3. Handle Payment Outcome
  if (event === 'payment.succeeded' || event === 'payment_intent.succeeded') {
    // Generate immutable receipt number (AC-FR-004.1)
    const receiptNumber = generateReceiptNumber(orderNumber);

    const paymentRecord = {
      id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      order_id: orderId,
      transaction_reference: transactionReference,
      payment_gateway: 'STRIPE',
      amount,
      currency,
      status: PAYMENT_STATUS.SUCCESS,
      receipt_number: receiptNumber,
      receipt_emailed: false,
      gateway_response: { method: paymentMethod, brand: 'Visa', last4: '4242' },
      settled_at: settledAt || new Date().toISOString(),
    };
    paymentsStore.set(transactionReference, paymentRecord);

    // Update order status to PAID
    const existingOrder = ordersStore.get(orderId);
    if (existingOrder) {
      existingOrder.status = ORDER_STATUS.PAID;
    }

    // Build verified receipt (AC-FR-004.1)
    const receipt = {
      receiptNumber,
      orderId,
      orderNumber: orderNumber || existingOrder?.orderNumber || orderId,
      transactionReference,
      settledAt: paymentRecord.settled_at,
      paymentMethod,
      paymentStatus: ORDER_STATUS.PAID,
      amount,
      currency,
      items: existingOrder?.drinks || [],
      subtotal: existingOrder?.subtotal || amount,
      vat: existingOrder?.vat || 0,
      discount: existingOrder?.discount || 0,
      deliveryFee: existingOrder?.deliveryFee || 0,
      total: amount,
      fulfillment: existingOrder?.fulfillment || null,
    };
    receiptsStore.set(orderId, receipt);

    return res.status(200).json({
      success: true,
      status: ORDER_STATUS.PAID,
      payment: paymentRecord,
      receipt,
    });
  }

  if (event === 'payment.failed' || event === 'payment_intent.payment_failed') {
    // Record failed payment attempt without marking order as PAID (AC-FR-004.2)
    const failedRecord = {
      id: `pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      order_id: orderId,
      transaction_reference: transactionReference,
      payment_gateway: 'STRIPE',
      amount,
      currency,
      status: PAYMENT_STATUS.FAILED,
      receipt_number: null,
      receipt_emailed: false,
      gateway_response: { error: 'Card declined / Insufficient funds' },
      settled_at: settledAt || new Date().toISOString(),
    };
    paymentsStore.set(transactionReference, failedRecord);

    // Ensure order remains PENDING_PAYMENT
    const existingOrder = ordersStore.get(orderId);
    if (existingOrder) {
      existingOrder.status = ORDER_STATUS.PENDING_PAYMENT;
    }

    return res.status(200).json({
      success: false,
      status: PAYMENT_STATUS.FAILED,
      orderStatus: ORDER_STATUS.PENDING_PAYMENT,
      message: 'Payment attempt was declined by issuing bank.',
      retryGuidance: 'Please check that card number and CVC are correct, or try a different payment method.',
    });
  }

  res.status(400).json({ error: `Unhandled webhook event type: ${event}` });
});

// FR-004: Interactive payment simulation helper (for prototype checkout testing)
app.post('/api/payments/simulate', async (req, res) => {
  const {
    orderId,
    orderNumber,
    amount,
    outcome = 'SUCCESS', // 'SUCCESS' | 'FAILED'
    paymentMethod = 'Visa ending in 4242',
  } = req.body;

  if (!orderId || !amount) {
    return res.status(400).json({ error: 'orderId and amount are required' });
  }

  const transactionReference = `txn_sim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const event = outcome === 'SUCCESS' ? 'payment.succeeded' : 'payment.failed';

  const payload = {
    event,
    transactionReference,
    orderId,
    orderNumber,
    amount,
    paymentMethod,
    settledAt: new Date().toISOString(),
  };

  // Sign payload using shared secret
  const signature = await generateHmacSignature(payload, DEFAULT_WEBHOOK_SECRET);

  // Dispatch internally through webhook processing logic
  const mockReq = {
    headers: { 'x-gateway-signature': signature },
    rawBody: Buffer.from(JSON.stringify(payload)),
    body: payload,
  };

  let responseData = null;
  let responseStatus = 200;
  const mockRes = {
    status: (code) => {
      responseStatus = code;
      return mockRes;
    },
    json: (data) => {
      responseData = data;
      return mockRes;
    },
  };

  // Run through webhook handler
  const webhookHandler = app._router.stack
    .find((r) => r.route && r.route.path === '/api/webhooks/payment' && r.route.methods.post)
    ?.route?.stack[0]?.handle;

  if (webhookHandler) {
    await webhookHandler(mockReq, mockRes);
    return res.status(responseStatus).json(responseData);
  }

  res.status(500).json({ error: 'Webhook route not configured' });
});

// FR-004: Get verified receipt for order
app.get('/api/orders/:orderId/receipt', (req, res) => {
  const { orderId } = req.params;
  const receipt = receiptsStore.get(orderId);
  if (!receipt) {
    return res.status(404).json({ error: `Receipt not found for order "${orderId}"` });
  }
  res.json({ success: true, receipt });
});

export default app;
