import express from 'express';
import cors from 'cors';
import {
  MIN_DRINKS_PER_ORDER,
  MAX_DRINKS_PER_ORDER,
  USER_ROLES,
  ORDER_STATUS,
  validateOrder,
  calculateOrderTotals,
} from '@milky-shakes/shared';

const app = express();

app.use(cors());
app.use(express.json());

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
  const { drinks, discountTier, vatRate } = req.body;
  if (!Array.isArray(drinks)) {
    return res.status(400).json({ error: 'Drinks array is required' });
  }

  const totals = calculateOrderTotals(drinks, discountTier, vatRate);
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

  const totals = calculateOrderTotals(orderData.drinks, orderData.discountTier);
  const orderId = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Create verified order record
  const createdOrder = {
    id: orderId,
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
    total: totals.total,
    createdAt: new Date().toISOString(),
  };

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    orders: createdOrder,
    order: createdOrder,
  });
});

export default app;
