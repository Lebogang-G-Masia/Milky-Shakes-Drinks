// Core Schema Model definitions for Supabase PostgreSQL per schema.md
export const tableNames = {
  P_USER: 'p_user',
  USERS: 'users',
  RESTAURANTS: 'restaurants',
  FLAVOURS: 'flavours',
  CONSISTENCIES: 'consistencies',
  TOPPINGS: 'toppings',
  DISCOUNT_TIERS: 'discount_tiers',
  SYSTEM_CONFIG: 'system_config',
  ORDERS: 'orders',
  ORDER_ITEMS: 'order_items',
  PAYMENTS: 'payments',
  AUDIT_LOGS: 'audit_logs',
};

export const customEnums = {
  USER_ROLE: ['PATRON', 'STAFF', 'MANAGER'],
  ORDER_STATUS: [
    'PENDING_PAYMENT',
    'PAID',
    'PREPARING',
    'READY',
    'COLLECTED',
    'CANCELLED',
  ],
  PAYMENT_STATUS: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
};
