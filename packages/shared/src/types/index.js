/**
 * @typedef {Object} UserProfile
 * @property {string} id
 * @property {string} email
 * @property {string} [name]
 * @property {'PATRON'|'STAFF'|'MANAGER'} role
 * @property {string} createdAt
 */

/**
 * @typedef {Object} Order
 * @property {string} [id]
 * @property {string} order_number
 * @property {string} [patron_id]
 * @property {string} [restaurant_id]
 * @property {string} [pickup_time]
 * @property {number} number_of_drinks
 * @property {number} subtotal_amount
 * @property {number} discount_amount
 * @property {number} vat_rate
 * @property {number} vat_amount
 * @property {number} total_amount
 * @property {'PENDING_PAYMENT'|'PAID'|'PREPARING'|'READY'|'COLLECTED'|'CANCELLED'} status
 * @property {string} [created_at]
 * @property {string} [updated_at]
 */

/**
 * @typedef {Object} OrderItem
 * @property {string} [id]
 * @property {string} order_id
 * @property {number} drink_number
 * @property {string} flavour_id
 * @property {string} flavour_name_snapshot
 * @property {number} flavour_price_snapshot
 * @property {string} consistency_id
 * @property {string} consistency_name_snapshot
 * @property {number} consistency_price_snapshot
 * @property {string} topping_id
 * @property {string} topping_name_snapshot
 * @property {number} topping_price_snapshot
 * @property {number} item_total
 * @property {string} [created_at]
 */

export {};
