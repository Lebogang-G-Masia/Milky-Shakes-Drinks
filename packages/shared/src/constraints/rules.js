export const MIN_DRINKS_PER_ORDER = 1;
export const MAX_DRINKS_PER_ORDER = 10;
export const DEFAULT_VAT_RATE = 0.15;
export const DEFAULT_DELIVERY_FEE = 15.00;

export const USER_ROLES = {
  PATRON: 'PATRON',
  STAFF: 'STAFF',
  MANAGER: 'MANAGER',
};

export const FULFILLMENT_MODES = {
  PICKUP: 'PICKUP',
  DELIVERY: 'DELIVERY',
};

export const ORDER_STATUS = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAID: 'PAID',
  PREPARING: 'PREPARING',
  READY: 'READY',
  COLLECTED: 'COLLECTED',
  CANCELLED: 'CANCELLED',
};

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
};

export const PAYMENT_GATEWAYS = {
  STRIPE: 'STRIPE',
  INTEGRATED_PAYMENT: 'INTEGRATED_PAYMENT',
};

export const DEFAULT_WEBHOOK_SECRET = 'whsec_milky_shakes_test_secret_key_2026';

export const REPORT_DATE_PRESETS = {
  TODAY: 'TODAY',
  LAST_7_DAYS: 'LAST_7_DAYS',
  LAST_30_DAYS: 'LAST_30_DAYS',
  ALL_TIME: 'ALL_TIME',
  CUSTOM: 'CUSTOM',
};

export const AUDIT_ACTIONS = {
  ORDER_CREATED: 'ORDER_CREATED',
  PAYMENT_AUTHORIZED: 'PAYMENT_AUTHORIZED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  REPORT_ACCESSED: 'REPORT_ACCESSED',
  REPORT_EXPORTED: 'REPORT_EXPORTED',
};

export const EXPORT_FORMATS = {
  CSV: 'CSV',
  PDF: 'PDF',
};

/**
 * Checks whether a role is an authorized administrative role (MANAGER or STAFF)
 * @param {string} role
 * @returns {boolean}
 */
export function isAdminRole(role) {
  return role === USER_ROLES.MANAGER || role === USER_ROLES.STAFF;
}

