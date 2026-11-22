/**
 * @typedef {Object} UserProfile
 * @property {string} id
 * @property {string} email
 * @property {string} [name]
 * @property {'PATRON'|'STAFF'|'MANAGER'} role
 * @property {string} createdAt
 */

/**
 * @typedef {Object} FulfillmentDetails
 * @property {'PICKUP'|'DELIVERY'} mode
 * @property {string} [restaurantId]
 * @property {string} [restaurantName]
 * @property {string} [pickupTime]
 * @property {string} [streetAddress]
 * @property {string} [postalCode]
 * @property {string} [recipientPhone]
 * @property {string} [deliveryInstructions]
 */

/**
 * @typedef {Object} Order
 * @property {string} [id]
 * @property {string} order_number
 * @property {string} [patron_id]
 * @property {string} [restaurant_id]
 * @property {string} [pickup_time]
 * @property {'PICKUP'|'DELIVERY'} [fulfillment_mode]
 * @property {string} [delivery_address]
 * @property {string} [delivery_postal_code]
 * @property {string} [recipient_phone]
 * @property {string} [delivery_instructions]
 * @property {FulfillmentDetails} [fulfillment]
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

/**
 * @typedef {Object} PaymentRecord
 * @property {string} [id]
 * @property {string} order_id
 * @property {string} transaction_reference
 * @property {string} payment_gateway
 * @property {number} amount
 * @property {string} currency
 * @property {'PENDING'|'SUCCESS'|'FAILED'|'REFUNDED'} status
 * @property {string} receipt_number
 * @property {boolean} [receipt_emailed]
 * @property {Object} [gateway_response]
 * @property {string} settled_at
 */

/**
 * @typedef {Object} PaymentReceipt
 * @property {string} receiptNumber
 * @property {string} orderNumber
 * @property {string} transactionReference
 * @property {string} settledAt
 * @property {string} paymentMethod
 * @property {'PAID'|'PENDING'|'FAILED'} paymentStatus
 * @property {Array} items
 * @property {number} subtotal
 * @property {number} vat
 * @property {number} discount
 * @property {number} deliveryFee
 * @property {number} total
 * @property {FulfillmentDetails} fulfillment
 */

/**
 * @typedef {Object} ReportingFilters
 * @property {'TODAY'|'LAST_7_DAYS'|'LAST_30_DAYS'|'ALL_TIME'|'CUSTOM'} [datePreset]
 * @property {string} [startDate]
 * @property {string} [endDate]
 * @property {string|string[]} [status]
 * @property {'ALL'|'PICKUP'|'DELIVERY'} [fulfillmentMode]
 * @property {string} [flavour]
 * @property {string} [topping]
 * @property {number} [minTotal]
 * @property {number} [maxTotal]
 * @property {string} [searchTerm]
 * @property {number} [page]
 * @property {number} [limit]
 */

/**
 * @typedef {Object} AggregatedMetrics
 * @property {number} totalOrders
 * @property {number} grossRevenue
 * @property {number} paidOrdersCount
 * @property {number} averageOrderValue
 * @property {{ pickupCount: number, deliveryCount: number, pickupPercentage: number, deliveryPercentage: number }} fulfillment
 * @property {Object.<string, number>} statusBreakdown
 * @property {Array<{ name: string, count: number }>} topFlavours
 * @property {Array<{ name: string, count: number }>} topToppings
 */

/**
 * @typedef {Object} AuditLogEntry
 * @property {string} id
 * @property {string} [actor_id]
 * @property {'MANAGER'|'STAFF'|'PATRON'|'SYSTEM'} actor_role
 * @property {string} action
 * @property {string} entity_type
 * @property {string} entity_id
 * @property {string} [field_name]
 * @property {*} [previous_value]
 * @property {*} [new_value]
 * @property {string} [ip_address]
 * @property {string} created_at
 */

export {};
