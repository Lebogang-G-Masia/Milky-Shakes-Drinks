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
import { sendOrderConfirmationEmail } from './emailService.js';

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

    // Dispatch confirmation & tax invoice email if recipient email is available
    const recipientEmail = req.body.patronEmail || req.body.customerEmail || existingOrder?.customerEmail;
    if (recipientEmail) {
      try {
        const emailResult = await sendOrderConfirmationEmail({
          to: recipientEmail,
          customerName: req.body.customerName || existingOrder?.customerName || 'Valued Customer',
          order: existingOrder || receipt,
          receipt,
          fulfillment: receipt.fulfillment,
        });
        if (emailResult.success) {
          paymentRecord.receipt_emailed = true;
        }
      } catch (err) {
        console.warn('[Webhook] Confirmation email dispatch deferred or failed:', err.message);
      }
    }

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

// FR-004: Send or resend order confirmation & tax invoice email to customer
app.post('/api/orders/email-receipt', async (req, res) => {
  const { order, receipt, customerEmail, customerName } = req.body;
  if (!order && !receipt) {
    return res.status(400).json({ success: false, error: 'Order or receipt object is required' });
  }

  const to = customerEmail || order?.customerEmail || order?.patronEmail || receipt?.customerEmail;
  if (!to) {
    return res.status(400).json({ success: false, error: 'customerEmail is required' });
  }

  const resolvedName = customerName || order?.customerName || order?.cardholderName || 'Valued Customer';
  const resolvedOrder = order || receipt;
  const resolvedReceipt = receipt || order?.payment || {};
  const resolvedFulfillment = order?.fulfillment || receipt?.fulfillment || {};

  try {
    const result = await sendOrderConfirmationEmail({
      to,
      customerName: resolvedName,
      order: resolvedOrder,
      receipt: resolvedReceipt,
      fulfillment: resolvedFulfillment,
    });

    if (result.success && resolvedOrder.id && paymentsStore.size > 0) {
      for (const pay of paymentsStore.values()) {
        if (pay.order_id === resolvedOrder.id) {
          pay.receipt_emailed = true;
        }
      }
    }

    return res.json(result);
  } catch (err) {
    console.error('[API] /api/orders/email-receipt error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
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

// ==========================================
// FR-005+: Operational Order Management & Inventory Control
// ==========================================

export const inventoryStore = new Map([
  ['flav-1', { id: 'flav-1', name: 'Cookies & Cream', category: 'Signature Artisan', price: 48.0, stockStatus: 'IN_STOCK', remainingPortions: 45, featured: true }],
  ['flav-2', { id: 'flav-2', name: 'Wild Strawberry', category: 'Signature Artisan', price: 45.0, stockStatus: 'IN_STOCK', remainingPortions: 32, featured: true }],
  ['flav-3', { id: 'flav-3', name: 'Mint Chocolate Chip', category: 'Signature Artisan', price: 44.0, stockStatus: 'IN_STOCK', remainingPortions: 28, featured: true }],
  ['flav-4', { id: 'flav-4', name: 'Belgian Chocolate', category: 'Classic Indulgence', price: 48.0, stockStatus: 'IN_STOCK', remainingPortions: 50, featured: false }],
  ['flav-5', { id: 'flav-5', name: 'Madagascan Vanilla', category: 'Classic Indulgence', price: 38.0, stockStatus: 'IN_STOCK', remainingPortions: 60, featured: false }],
  ['flav-6', { id: 'flav-6', name: 'Salted Caramel', category: 'Signature Artisan', price: 48.0, stockStatus: 'IN_STOCK', remainingPortions: 22, featured: true }],
  ['flav-7', { id: 'flav-7', name: 'Peanut Butter Blast', category: 'Seasonal Special', price: 52.0, stockStatus: 'LOW_STOCK', remainingPortions: 8, featured: false }],
  ['flav-8', { id: 'flav-8', name: 'Bubblegum Dream', category: 'Fun Retro', price: 39.0, stockStatus: 'LOW_STOCK', remainingPortions: 4, featured: false }],
  ['top-1', { id: 'top-1', name: 'Whipped Double Cream', category: 'Topping', price: 12.0, stockStatus: 'IN_STOCK', remainingPortions: 75, featured: false }],
  ['top-2', { id: 'top-2', name: 'Crushed Cadbury Flake', category: 'Topping', price: 14.0, stockStatus: 'LOW_STOCK', remainingPortions: 5, featured: false }],
  ['top-3', { id: 'top-3', name: 'Oreo Crumb Dust', category: 'Topping', price: 12.0, stockStatus: 'IN_STOCK', remainingPortions: 42, featured: false }],
  ['top-4', { id: 'top-4', name: 'Rainbow Sprinkles', category: 'Topping', price: 8.0, stockStatus: 'IN_STOCK', remainingPortions: 90, featured: false }],
  ['top-5', { id: 'top-5', name: 'Caramel Fudge Cubes', category: 'Topping', price: 15.0, stockStatus: 'IN_STOCK', remainingPortions: 24, featured: false }],
  ['top-6', { id: 'top-6', name: 'Rich Chocolate Drops', category: 'Topping', price: 10.0, stockStatus: 'IN_STOCK', remainingPortions: 50, featured: false }],
]);

export let storeStatus = {
  mode: 'OPEN', // 'OPEN' | 'BUSY' | 'PAUSED'
  leadManager: 'Sarah Connor',
  shiftCode: 'SHIFT-A204',
  activeBaristas: 3,
  couriersAvailable: 2,
  averagePrepMinutes: 7.5,
  rushExtraMinutes: 0,
  announcement: 'Fresh organic strawberries delivered this morning! Highlight Wild Strawberry specials.',
  updatedAt: new Date().toISOString(),
};

// 5. Update Order Status in Real-Time (AC-FR-005.1 / Kitchen Operations)
app.patch('/api/admin/orders/:orderId/status', requireAdminRole, (req, res) => {
  const { orderId } = req.params;
  const { status, note } = req.body;

  if (!status || !Object.values(ORDER_STATUS).includes(status)) {
    return res.status(400).json({
      success: false,
      error: `Invalid status: "${status}". Valid statuses: ${Object.values(ORDER_STATUS).join(', ')}`,
    });
  }

  seedSampleOrdersIfEmpty();
  let order = ordersStore.get(orderId);

  // If order is referenced by orderNumber
  if (!order) {
    for (const ord of ordersStore.values()) {
      if (ord.orderNumber === orderId) {
        order = ord;
        break;
      }
    }
  }

  if (!order) {
    return res.status(404).json({ success: false, error: `Order "${orderId}" not found` });
  }

  const previousStatus = order.status;
  order.status = status;
  order.updatedAt = new Date().toISOString();
  if (note) order.managerNote = note;

  recordAuditLog({
    action: AUDIT_ACTIONS.STATUS_CHANGED,
    actorRole: req.adminRole || USER_ROLES.MANAGER,
    entityType: 'orders',
    entityId: order.id,
    previousValue: previousStatus,
    newValue: `${status}${note ? ` (Note: ${note})` : ''}`,
  });

  res.json({
    success: true,
    message: `Order ${order.orderNumber} successfully updated to ${status}`,
    order: sanitizeOrderForAdmin(order),
  });
});

// 6. Get & Update Inventory Items
app.get('/api/admin/inventory', requireAdminRole, (req, res) => {
  res.json({
    success: true,
    inventory: Array.from(inventoryStore.values()),
    timestamp: new Date().toISOString(),
  });
});

app.patch('/api/admin/inventory/:itemId', requireAdminRole, (req, res) => {
  const { itemId } = req.params;
  const { stockStatus, remainingPortions, price, featured } = req.body;

  const item = inventoryStore.get(itemId);
  if (!item) {
    return res.status(404).json({ success: false, error: `Inventory item "${itemId}" not found` });
  }

  const previousState = JSON.stringify(item);
  if (stockStatus !== undefined) item.stockStatus = stockStatus;
  if (remainingPortions !== undefined) item.remainingPortions = remainingPortions;
  if (price !== undefined) item.price = Number(price);
  if (featured !== undefined) item.featured = Boolean(featured);
  item.updatedAt = new Date().toISOString();

  recordAuditLog({
    action: 'INVENTORY_UPDATED',
    actorRole: req.adminRole || USER_ROLES.MANAGER,
    entityType: 'inventory',
    entityId: itemId,
    previousValue: previousState,
    newValue: JSON.stringify(item),
  });

  res.json({
    success: true,
    item,
    message: `Inventory item ${item.name} updated.`,
  });
});

// 7. Get & Update Store Operational Status
app.get('/api/admin/store-status', requireAdminRole, (req, res) => {
  res.json({
    success: true,
    storeStatus,
  });
});

app.patch('/api/admin/store-status', requireAdminRole, (req, res) => {
  const { mode, rushExtraMinutes, announcement, leadManager } = req.body;

  const previousState = JSON.stringify(storeStatus);
  if (mode) storeStatus.mode = mode;
  if (rushExtraMinutes !== undefined) storeStatus.rushExtraMinutes = Number(rushExtraMinutes);
  if (announcement !== undefined) storeStatus.announcement = announcement;
  if (leadManager) storeStatus.leadManager = leadManager;
  storeStatus.updatedAt = new Date().toISOString();

  recordAuditLog({
    action: 'STORE_STATUS_CHANGED',
    actorRole: req.adminRole || USER_ROLES.MANAGER,
    entityType: 'store_settings',
    entityId: 'main-store',
    previousValue: previousState,
    newValue: JSON.stringify(storeStatus),
  });

  res.json({
    success: true,
    storeStatus,
    message: `Store operational mode updated to ${storeStatus.mode}.`,
  });
});

// ==========================================
// MANDATORY #3 & #10: LOOKUP TABLE MANAGER & AUDIT TRAIL (URS 3.4.3 & 3.4.6)
// ==========================================

export const lookupsStore = {
  flavours: [
    { id: 'flav-strawberry', name: 'Strawberry', type: 'Signature Artisan', price: 35.0, isActive: true, updatedAt: new Date().toISOString() },
    { id: 'flav-vanilla', name: 'Vanilla', type: 'Classic Indulgence', price: 32.0, isActive: true, updatedAt: new Date().toISOString() },
    { id: 'flav-chocolate', name: 'Chocolate', type: 'Classic Indulgence', price: 38.0, isActive: true, updatedAt: new Date().toISOString() },
    { id: 'flav-coffee', name: 'Coffee', type: 'Signature Artisan', price: 36.0, isActive: true, updatedAt: new Date().toISOString() },
    { id: 'flav-banana', name: 'Banana', type: 'Fresh Fruit', price: 34.0, isActive: true, updatedAt: new Date().toISOString() },
    { id: 'flav-oreo', name: 'Oreo', type: 'Signature Artisan', price: 42.0, isActive: true, updatedAt: new Date().toISOString() },
    { id: 'flav-barone', name: 'Bar one', type: 'Decadent Special', price: 45.0, isActive: true, updatedAt: new Date().toISOString() },
    { id: 'flav-mint', name: 'Mint Chocolate Chip', type: 'Signature Artisan', price: 44.0, isActive: true, updatedAt: new Date().toISOString() },
  ],
  toppings: [
    { id: 'top-strawberries', name: 'Frozen Strawberries', type: 'Topping', price: 8.0, isActive: true, updatedAt: new Date().toISOString() },
    { id: 'top-banana', name: 'Freeze-dried banana', type: 'Topping', price: 10.0, isActive: true, updatedAt: new Date().toISOString() },
    { id: 'top-oreo', name: 'Oreo crumbs', type: 'Topping', price: 8.0, isActive: true, updatedAt: new Date().toISOString() },
    { id: 'top-barone', name: 'Bar one syrup', type: 'Topping', price: 10.0, isActive: true, updatedAt: new Date().toISOString() },
    { id: 'top-coffee', name: 'Coffee powder with chocolate', type: 'Topping', price: 8.0, isActive: true, updatedAt: new Date().toISOString() },
    { id: 'top-vermicelli', name: 'Chocolate vermicelli', type: 'Topping', price: 6.0, isActive: true, updatedAt: new Date().toISOString() },
    { id: 'top-cream', name: 'Whipped Double Cream', type: 'Topping', price: 12.0, isActive: true, updatedAt: new Date().toISOString() },
  ],
  consistencies: [
    { id: 'cons-double-thick', name: 'Double thick', type: 'Consistency', extraPrice: 10.0, isActive: true, updatedAt: new Date().toISOString() },
    { id: 'cons-thick', name: 'Thick', type: 'Consistency', extraPrice: 5.0, isActive: true, updatedAt: new Date().toISOString() },
    { id: 'cons-milky', name: 'Milky', type: 'Consistency', extraPrice: 0.0, isActive: true, updatedAt: new Date().toISOString() },
    { id: 'cons-icy', name: 'Icy', type: 'Consistency', extraPrice: 0.0, isActive: true, updatedAt: new Date().toISOString() },
  ],
  configurations: {
    MIN_DRINKS_PER_ORDER: { key: 'MIN_DRINKS_PER_ORDER', value: 1, label: 'Minimum Drinks Per Order', description: 'Lowest allowable drinks per order', updatedAt: new Date().toISOString() },
    MAX_DRINKS_PER_ORDER: { key: 'MAX_DRINKS_PER_ORDER', value: 10, label: 'Maximum Drinks Per Order', description: 'Highest allowable drinks per order', updatedAt: new Date().toISOString() },
    VAT_PERCENTAGE: { key: 'VAT_PERCENTAGE', value: 15.0, label: 'VAT Rate (%)', description: 'Statutory Value-Added Tax percentage', updatedAt: new Date().toISOString() },
    DISCOUNT_TIER_1_ORDERS: { key: 'DISCOUNT_TIER_1_ORDERS', value: 3, label: 'Discount Tier 1 Min Orders', description: 'Completed orders needed for 5% discount', updatedAt: new Date().toISOString() },
    DISCOUNT_TIER_1_PERCENT: { key: 'DISCOUNT_TIER_1_PERCENT', value: 5, label: 'Discount Tier 1 (%)', description: 'First tier discount percentage', updatedAt: new Date().toISOString() },
    DISCOUNT_TIER_2_ORDERS: { key: 'DISCOUNT_TIER_2_ORDERS', value: 5, label: 'Discount Tier 2 Min Orders', description: 'Completed orders needed for 10% discount', updatedAt: new Date().toISOString() },
    DISCOUNT_TIER_2_PERCENT: { key: 'DISCOUNT_TIER_2_PERCENT', value: 10, label: 'Discount Tier 2 (%)', description: 'Second tier discount percentage', updatedAt: new Date().toISOString() },
    DISCOUNT_TIER_3_ORDERS: { key: 'DISCOUNT_TIER_3_ORDERS', value: 10, label: 'Discount Tier 3 Min Orders', description: 'Completed orders needed for 15% discount', updatedAt: new Date().toISOString() },
    DISCOUNT_TIER_3_PERCENT: { key: 'DISCOUNT_TIER_3_PERCENT', value: 15, label: 'Discount Tier 3 (%)', description: 'Third tier discount percentage', updatedAt: new Date().toISOString() },
    MAX_DISCOUNT_CAP: { key: 'MAX_DISCOUNT_CAP', value: 100.0, label: 'Max Discount Cap (R)', description: 'Maximum allowable frequent customer discount per order in Rand', updatedAt: new Date().toISOString() },
  },
};

// Public Lookup Retrieval (Catalog + Config)
app.get('/api/lookups', (req, res) => {
  res.json({
    success: true,
    flavours: lookupsStore.flavours,
    toppings: lookupsStore.toppings,
    consistencies: lookupsStore.consistencies,
    configurations: lookupsStore.configurations,
    timestamp: new Date().toISOString(),
  });
});

// Admin Lookup: Add New Item
app.post('/api/admin/lookups/:type', requireAdminRole, (req, res) => {
  const { type } = req.params; // 'flavours' | 'toppings'
  const { name, price, itemType } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ success: false, error: 'Name and price are required' });
  }

  const list = lookupsStore[type];
  if (!list) {
    return res.status(400).json({ success: false, error: `Invalid lookup type "${type}"` });
  }

  const id = `${type.slice(0, 4)}-${Date.now()}`;
  const newItem = {
    id,
    name: name.trim(),
    type: itemType || (type === 'flavours' ? 'Signature Artisan' : 'Topping'),
    price: Math.max(0, Number(price)),
    isActive: true,
    updatedAt: new Date().toISOString(),
  };

  list.push(newItem);

  recordAuditLog({
    action: 'LOOKUP_CREATED',
    actorRole: req.adminRole || USER_ROLES.MANAGER,
    entityType: type.toUpperCase(),
    entityId: id,
    fieldName: 'all',
    previousValue: null,
    newValue: JSON.stringify(newItem),
  });

  res.status(201).json({ success: true, item: newItem, message: `${name} added to ${type}` });
});

// Admin Lookup: Update Item (Price, Name, Active Status)
app.patch('/api/admin/lookups/:type/:id', requireAdminRole, (req, res) => {
  const { type, id } = req.params;
  const { name, price, extraPrice, itemType, isActive } = req.body;

  const list = lookupsStore[type];
  if (!list) {
    return res.status(400).json({ success: false, error: `Invalid lookup type "${type}"` });
  }

  const item = list.find((i) => i.id === id);
  if (!item) {
    return res.status(404).json({ success: false, error: `Item "${id}" not found in ${type}` });
  }

  const previousState = JSON.stringify(item);
  let changedField = '';
  let prevVal = '';
  let newVal = '';

  if (name !== undefined && name.trim() !== item.name) {
    changedField = 'name';
    prevVal = item.name;
    newVal = name.trim();
    item.name = name.trim();
  }
  if (price !== undefined && Number(price) !== item.price) {
    changedField = 'price';
    prevVal = `R${item.price.toFixed(2)}`;
    newVal = `R${Number(price).toFixed(2)}`;
    item.price = Math.max(0, Number(price));
  }
  if (extraPrice !== undefined && Number(extraPrice) !== item.extraPrice) {
    changedField = 'extraPrice';
    prevVal = `R${(item.extraPrice || 0).toFixed(2)}`;
    newVal = `R${Number(extraPrice).toFixed(2)}`;
    item.extraPrice = Math.max(0, Number(extraPrice));
  }
  if (itemType !== undefined) {
    item.type = itemType;
  }
  if (isActive !== undefined && Boolean(isActive) !== item.isActive) {
    changedField = 'isActive';
    prevVal = String(item.isActive);
    newVal = String(Boolean(isActive));
    item.isActive = Boolean(isActive);
  }

  item.updatedAt = new Date().toISOString();

  recordAuditLog({
    action: 'LOOKUP_UPDATED',
    actorRole: req.adminRole || USER_ROLES.MANAGER,
    entityType: type.toUpperCase(),
    entityId: id,
    fieldName: changedField || 'multiple',
    previousValue: prevVal || previousState,
    newValue: newVal || JSON.stringify(item),
  });

  res.json({ success: true, item, message: `Updated ${item.name} in ${type}` });
});

// Admin Lookup: Delete / Deactivate Item
app.delete('/api/admin/lookups/:type/:id', requireAdminRole, (req, res) => {
  const { type, id } = req.params;
  const list = lookupsStore[type];
  if (!list) {
    return res.status(400).json({ success: false, error: `Invalid lookup type "${type}"` });
  }

  const item = list.find((i) => i.id === id);
  if (!item) {
    return res.status(404).json({ success: false, error: `Item "${id}" not found in ${type}` });
  }

  const previousState = JSON.stringify(item);
  item.isActive = false;
  item.updatedAt = new Date().toISOString();

  recordAuditLog({
    action: 'LOOKUP_DELETED',
    actorRole: req.adminRole || USER_ROLES.MANAGER,
    entityType: type.toUpperCase(),
    entityId: id,
    fieldName: 'isActive',
    previousValue: previousState,
    newValue: JSON.stringify(item),
  });

  res.json({ success: true, message: `Deactivated ${item.name}` });
});

// Admin Configurations: Update Setting (VAT, Min/Max drinks, Discount rules)
app.patch('/api/admin/configurations/:key', requireAdminRole, (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  if (value === undefined) {
    return res.status(400).json({ success: false, error: 'Value is required' });
  }

  const config = lookupsStore.configurations[key];
  if (!config) {
    return res.status(404).json({ success: false, error: `Configuration "${key}" not found` });
  }

  const previousValue = String(config.value);
  config.value = typeof config.value === 'number' ? Number(value) : value;
  config.updatedAt = new Date().toISOString();

  recordAuditLog({
    action: 'CONFIG_UPDATED',
    actorRole: req.adminRole || USER_ROLES.MANAGER,
    entityType: 'CONFIGURATION',
    entityId: key,
    fieldName: key,
    previousValue,
    newValue: String(config.value),
  });

  res.json({ success: true, config, message: `Configuration ${config.label} updated to ${config.value}` });
});

// ==========================================
// MANDATORY #9: PATRON ORDER HISTORY & RE-PRINT PORTAL (URS 3.4.7)
// ==========================================

app.get('/api/patron/orders', (req, res) => {
  const email = (req.headers['x-user-email'] || req.query.email || '').toLowerCase().trim();
  const userId = req.headers['x-user-id'] || req.query.userId || '';

  const allOrders = getAllOrders();
  let patronOrders = [];

  if (email || userId) {
    patronOrders = allOrders.filter((o) => {
      const matchEmail = email && (o.customerEmail || '').toLowerCase() === email;
      const matchId = userId && (o.userId === userId || o.patronId === userId);
      return matchEmail || matchId;
    });
  } else {
    // If no filter, return sample completed orders for demo
    patronOrders = allOrders.slice(0, 5);
  }

  // Calculate patron loyalty status
  const completedCount = patronOrders.filter((o) => o.status === ORDER_STATUS.PAID || o.status === ORDER_STATUS.COLLECTED).length;
  let currentDiscountTier = 0;
  if (completedCount >= lookupsStore.configurations.DISCOUNT_TIER_3_ORDERS.value) {
    currentDiscountTier = lookupsStore.configurations.DISCOUNT_TIER_3_PERCENT.value;
  } else if (completedCount >= lookupsStore.configurations.DISCOUNT_TIER_2_ORDERS.value) {
    currentDiscountTier = lookupsStore.configurations.DISCOUNT_TIER_2_PERCENT.value;
  } else if (completedCount >= lookupsStore.configurations.DISCOUNT_TIER_1_ORDERS.value) {
    currentDiscountTier = lookupsStore.configurations.DISCOUNT_TIER_1_PERCENT.value;
  }

  res.json({
    success: true,
    orders: patronOrders,
    loyalty: {
      completedOrdersCount: completedCount,
      eligibleDiscountPercent: currentDiscountTier,
      nextTierThreshold: completedCount < 3 ? 3 : completedCount < 5 ? 5 : completedCount < 10 ? 10 : 10,
      nextTierPercent: completedCount < 3 ? 5 : completedCount < 5 ? 10 : completedCount < 10 ? 15 : 15,
    },
    count: patronOrders.length,
  });
});

export default app;
