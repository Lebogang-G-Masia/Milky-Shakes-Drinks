import express from 'express';
import cors from 'cors';
import { MIN_DRINKS_PER_ORDER, MAX_DRINKS_PER_ORDER, USER_ROLES } from '@milky-shakes/shared';

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

export default app;
