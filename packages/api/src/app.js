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
  AUDIT_ACTIONS,
  REPORT_DATE_PRESETS,
  isAdminRole,
  validateOrder,
  calculateOrderTotals,
  generateReceiptNumber,
  generateHmacSignature,
  verifyHmacSignature,
  validateReportingFilters,
  filterOrders,
  calculateAggregatedMetrics,
  sanitizeOrderForAdmin,
  generateOrdersCsv,
} from '@milky-shakes/shared';
import { requireAdminRole } from './middleware/rbac.js';

const app = express();

// In-memory transactional stores for prototype testing & verification
export const ordersStore = new Map();
export const paymentsStore = new Map();
export const receiptsStore = new Map();
export const auditLogsStore = [];

/**
 * Records an immutable audit log entry (AC-FR-005.1).
 */
export function recordAuditLog({
  action,
  actorRole = 'SYSTEM',
  actorId = null,
  entityType,
  entityId,
  fieldName = null,
  previousValue = null,
  newValue = null,
  ipAddress = '127.0.0.1',
}) {
  const entry = {
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    action,
    actor_role: actorRole,
    actor_id: actorId,
    entity_type: entityType,
    entity_id: String(entityId),
    field_name: fieldName,
    previous_value: previousValue,
    new_value: newValue,
    ip_address: ipAddress,
    created_at: new Date().toISOString(),
  };
  auditLogsStore.unshift(entry);
  return entry;
}

// Seed representative historical orders for rich management audit & reporting demo
export function seedSampleOrdersIfEmpty() {
  if (ordersStore.size > 0) return;

  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  const samples = [
    {
      id: 'ord-sample-1',
      orderNumber: 'MSD-882101',
      userId: 'user-sample-1',
      customerEmail: 'sarah.connor@example.com',
      status: ORDER_STATUS.PAID,
      fulfillmentMode: 'PICKUP',
      fulfillment: {
        mode: 'PICKUP',
        restaurantId: 'rest-uuid-1',
        restaurantName: 'Milky Shaky Central',
        pickupTime: new Date(now - 2 * 3600 * 1000).toISOString(),
      },
      drinksCount: 2,
      drinks: [
        { flavourName: 'Belgian Chocolate', consistencyName: 'Thick', toppingName: 'Crushed Flake', cost: 48.00 },
        { flavourName: 'Madagascan Vanilla', consistencyName: 'Standard', toppingName: 'Sprinkles', cost: 38.00 },
      ],
      subtotal: 86.00,
      vat: 12.90,
      discount: 0,
      deliveryFee: 0,
      total: 98.90,
      createdAt: new Date(now - 2 * 3600 * 1000).toISOString(),
    },
    {
      id: 'ord-sample-2',
      orderNumber: 'MSD-882102',
      userId: 'user-sample-2',
      customerEmail: 'james.holden@example.com',
      status: ORDER_STATUS.PREPARING,
      fulfillmentMode: 'DELIVERY',
      fulfillment: {
        mode: 'DELIVERY',
        streetAddress: '42 Mariner Bay Road',
        postalCode: '8001',
        recipientPhone: '+27 82 555 1234',
        deliveryInstructions: 'Ring bell at blue gate',
      },
      drinksCount: 3,
      drinks: [
        { flavourName: 'Wild Strawberry', consistencyName: 'Thick', toppingName: 'Whipped Cream', cost: 45.00 },
        { flavourName: 'Salted Caramel', consistencyName: 'Thick', toppingName: 'Oreo Crumb', cost: 48.00 },
        { flavourName: 'Double Chocolate', consistencyName: 'Standard', toppingName: 'Chocolate Drops', cost: 40.00 },
      ],
      subtotal: 133.00,
      vat: 19.95,
      discount: 13.30,
      deliveryFee: 15.00,
      total: 154.65,
      createdAt: new Date(now - 5 * 3600 * 1000).toISOString(),
    },
    {
      id: 'ord-sample-3',
      orderNumber: 'MSD-882103',
      userId: 'user-sample-3',
      customerEmail: 'elena.rostova@example.com',
      status: ORDER_STATUS.READY,
      fulfillmentMode: 'PICKUP',
      fulfillment: {
        mode: 'PICKUP',
        restaurantId: 'rest-uuid-2',
        restaurantName: 'Milky Shaky Waterfront',
        pickupTime: new Date(now - 1 * oneDay).toISOString(),
      },
      drinksCount: 1,
      drinks: [
        { flavourName: 'Peanut Butter Blast', consistencyName: 'Thick', toppingName: 'Caramel Fudge', cost: 52.00 },
      ],
      subtotal: 52.00,
      vat: 7.80,
      discount: 0,
      deliveryFee: 0,
      total: 59.80,
      createdAt: new Date(now - 1 * oneDay).toISOString(),
    },
    {
      id: 'ord-sample-4',
      orderNumber: 'MSD-882104',
      userId: 'user-sample-4',
      customerEmail: 'marcus.vance@example.com',
      status: ORDER_STATUS.COLLECTED,
      fulfillmentMode: 'DELIVERY',
      fulfillment: {
        mode: 'DELIVERY',
        streetAddress: '15 Protea Avenue, Gardens',
        postalCode: '8001',
        recipientPhone: '+27 71 999 8888',
      },
      drinksCount: 4,
      drinks: [
        { flavourName: 'Wild Strawberry', consistencyName: 'Standard', toppingName: 'Sprinkles', cost: 38.00 },
        { flavourName: 'Belgian Chocolate', consistencyName: 'Thick', toppingName: 'Crushed Flake', cost: 48.00 },
        { flavourName: 'Madagascan Vanilla', consistencyName: 'Thick', toppingName: 'Whipped Cream', cost: 42.00 },
        { flavourName: 'Mint Choc Chip', consistencyName: 'Standard', toppingName: 'Choc Sauce', cost: 44.00 },
      ],
      subtotal: 172.00,
      vat: 25.80,
      discount: 0,
      deliveryFee: 15.00,
      total: 212.80,
      createdAt: new Date(now - 3 * oneDay).toISOString(),
    },
    {
      id: 'ord-sample-5',
      orderNumber: 'MSD-882105',
      userId: 'user-sample-5',
      customerEmail: 'linda.clark@example.com',
      status: ORDER_STATUS.CANCELLED,
      fulfillmentMode: 'PICKUP',
      fulfillment: {
        mode: 'PICKUP',
        restaurantId: 'rest-uuid-1',
        pickupTime: new Date(now - 4 * oneDay).toISOString(),
      },
      drinksCount: 1,
      drinks: [
        { flavourName: 'Bubblegum Dream', consistencyName: 'Standard', toppingName: 'Gummy Bears', cost: 39.00 },
      ],
      subtotal: 39.00,
      vat: 5.85,
      discount: 0,
      deliveryFee: 0,
      total: 44.85,
      createdAt: new Date(now - 4 * oneDay).toISOString(),
    },
  ];

  for (const s of samples) {
    ordersStore.set(s.id, s);
    recordAuditLog({
      action: AUDIT_ACTIONS.ORDER_CREATED,
      actorRole: USER_ROLES.PATRON,
      entityType: 'orders',
      entityId: s.id,
      newValue: `Order ${s.orderNumber} placed (${s.drinksCount} drinks, total R${s.total})`,
    });
    if (s.status === ORDER_STATUS.PAID || s.status === ORDER_STATUS.COLLECTED || s.status === ORDER_STATUS.READY) {
      recordAuditLog({
        action: AUDIT_ACTIONS.PAYMENT_AUTHORIZED,
        actorRole: 'SYSTEM',
        entityType: 'payments',
        entityId: `pay-${s.id}`,
        newValue: `Payment settled for R${s.total} via Stripe`,
      });
      recordAuditLog({
        action: AUDIT_ACTIONS.STATUS_CHANGED,
        actorRole: 'SYSTEM',
        entityType: 'orders',
        entityId: s.id,
        previousValue: ORDER_STATUS.PENDING_PAYMENT,
        newValue: s.status,
      });
    }
  }
}

// Initialize samples
seedSampleOrdersIfEmpty();

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

  recordAuditLog({
    action: AUDIT_ACTIONS.ORDER_CREATED,
    actorRole: USER_ROLES.PATRON,
    actorId: userId || null,
    entityType: 'orders',
    entityId: orderId,
    newValue: `Created order ${createdOrder.orderNumber} with ${createdOrder.drinksCount} drinks for total R${createdOrder.total}`,
  });

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

    recordAuditLog({
      action: AUDIT_ACTIONS.PAYMENT_AUTHORIZED,
      actorRole: 'SYSTEM',
      entityType: 'payments',
      entityId: paymentRecord.id,
      newValue: `Payment authorized for R${amount} (Receipt: ${receiptNumber}) via ${paymentMethod}`,
    });
    recordAuditLog({
      action: AUDIT_ACTIONS.STATUS_CHANGED,
      actorRole: 'SYSTEM',
      entityType: 'orders',
      entityId: orderId,
      previousValue: ORDER_STATUS.PENDING_PAYMENT,
      newValue: ORDER_STATUS.PAID,
    });

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

    recordAuditLog({
      action: AUDIT_ACTIONS.PAYMENT_FAILED,
      actorRole: 'SYSTEM',
      entityType: 'payments',
      entityId: failedRecord.id,
      newValue: 'Payment authorization failed: Card declined / Insufficient funds',
    });

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

// ==========================================
// FR-005: Management Oversight & Filtered Reporting (AC-FR-005.1, AC-FR-005.2, AC-FR-005.3)
// ==========================================

// Helper: retrieve all stored orders
export function getAllOrders() {
  seedSampleOrdersIfEmpty();
  return Array.from(ordersStore.values());
}

// 1. Executive Summary Metrics (AC-FR-005.1, AC-FR-005.3)
app.get('/api/admin/reports/summary', requireAdminRole, (req, res) => {
  const orders = getAllOrders();
  const metrics = calculateAggregatedMetrics(orders);
  res.json({
    success: true,
    metrics,
    generatedAt: new Date().toISOString(),
  });
});

// 2. Filtered Historical Orders with Clever Filters & SLA Performance Tracking (AC-FR-005.1, AC-FR-005.2, AC-FR-005.3)
app.get('/api/admin/reports/orders', requireAdminRole, (req, res) => {
  const startTime = performance.now();
  const validationErrors = validateReportingFilters(req.query);

  if (validationErrors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid reporting filter parameters',
      details: validationErrors,
    });
  }

  const allOrders = getAllOrders();
  const filtered = filterOrders(allOrders, req.query);

  // Pagination support
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '50', 10)));
  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

  // Sanitize order data to avoid exposing raw db keys, password hashes or internal secrets (AC-FR-005.1)
  const sanitizedOrders = paginated.map(sanitizeOrderForAdmin);

  const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
  const slaMet = durationMs < 500; // AC-FR-005.2: SLA < 500ms

  res.setHeader('X-Response-Time-Ms', durationMs);
  res.json({
    success: true,
    totalMatches: filtered.length,
    page,
    limit,
    totalPages: Math.ceil(filtered.length / limit),
    durationMs,
    slaMet,
    orders: sanitizedOrders,
  });
});

// 3. Chronological Audit Log Trail (AC-FR-005.1, AC-FR-005.3)
app.get('/api/admin/reports/audit-logs', requireAdminRole, (req, res) => {
  const limit = Math.max(1, Math.min(200, parseInt(req.query.limit || '100', 10)));
  const logs = auditLogsStore.slice(0, limit);
  res.json({
    success: true,
    count: logs.length,
    auditLogs: logs,
  });
});

// 4. Export Filtered Report to CSV (AC-FR-005.1, AC-FR-005.2, AC-FR-005.3)
app.get('/api/admin/reports/export', requireAdminRole, (req, res) => {
  const allOrders = getAllOrders();
  const filtered = filterOrders(allOrders, req.query);
  const csv = generateOrdersCsv(filtered);

  recordAuditLog({
    action: AUDIT_ACTIONS.REPORT_EXPORTED,
    actorRole: req.adminRole || USER_ROLES.MANAGER,
    entityType: 'reports',
    entityId: 'export-csv',
    newValue: `Exported ${filtered.length} order records to CSV`,
  });

  const filename = `milky-shakes-orders-report-${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

export default app;
