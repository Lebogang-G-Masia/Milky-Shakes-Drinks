import { ORDER_STATUS, FULFILLMENT_MODES, REPORT_DATE_PRESETS } from '../constraints/rules.js';

/**
 * Validates reporting filter parameters.
 * @param {Object} filters
 * @returns {string[]} Array of validation error messages.
 */
export function validateReportingFilters(filters = {}) {
  const errors = [];

  if (filters.status && filters.status !== 'ALL') {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    const validStatuses = Object.values(ORDER_STATUS);
    for (const s of statuses) {
      if (!validStatuses.includes(s)) {
        errors.push(`Invalid order status filter: ${s}`);
      }
    }
  }

  if (filters.fulfillmentMode && filters.fulfillmentMode !== 'ALL') {
    const validModes = Object.values(FULFILLMENT_MODES);
    if (!validModes.includes(filters.fulfillmentMode)) {
      errors.push(`Invalid fulfillment mode filter: ${filters.fulfillmentMode}`);
    }
  }

  if (filters.minTotal !== undefined && filters.minTotal !== null && filters.minTotal !== '') {
    const min = Number(filters.minTotal);
    if (isNaN(min) || min < 0) {
      errors.push('minTotal must be a non-negative number');
    }
  }

  if (filters.maxTotal !== undefined && filters.maxTotal !== null && filters.maxTotal !== '') {
    const max = Number(filters.maxTotal);
    if (isNaN(max) || max < 0) {
      errors.push('maxTotal must be a non-negative number');
    }
  }

  if (
    filters.minTotal !== undefined &&
    filters.maxTotal !== undefined &&
    Number(filters.minTotal) > Number(filters.maxTotal)
  ) {
    errors.push('minTotal cannot exceed maxTotal');
  }

  if (filters.startDate && isNaN(Date.parse(filters.startDate))) {
    errors.push('startDate must be a valid ISO date string');
  }

  if (filters.endDate && isNaN(Date.parse(filters.endDate))) {
    errors.push('endDate must be a valid ISO date string');
  }

  return errors;
}

/**
 * Normalizes an order record across in-memory and database shapes.
 * @param {Object} order
 * @returns {Object}
 */
export function normalizeOrderRecord(order) {
  const total = Number(order.total ?? order.total_amount ?? 0);
  const subtotal = Number(order.subtotal ?? order.subtotal_amount ?? 0);
  const vat = Number(order.vat ?? order.vat_amount ?? 0);
  const discount = Number(order.discount ?? order.discount_amount ?? 0);
  const deliveryFee = Number(order.deliveryFee ?? (order.fulfillment_mode === 'DELIVERY' || order.fulfillment?.mode === 'DELIVERY' ? 15.00 : 0));
  const drinksCount = Number(order.drinksCount ?? order.number_of_drinks ?? (order.drinks ? order.drinks.length : (order.order_items ? order.order_items.length : 0)));
  const createdAt = order.createdAt || order.created_at || new Date().toISOString();
  const fulfillmentMode = order.fulfillment?.mode || order.fulfillment_mode || order.fulfillmentMode || 'PICKUP';

  return {
    id: order.id,
    orderNumber: order.orderNumber || order.order_number,
    userId: order.userId || order.patron_id || 'anonymous',
    customerEmail: order.customerEmail || order.patronEmail || order.patron_email || (order.patron_id ? `patron-${String(order.patron_id).slice(0, 8)}@milkyshakes.com` : 'patron@milkyshakes.com'),
    status: order.status || ORDER_STATUS.PENDING_PAYMENT,
    fulfillmentMode,
    fulfillment: order.fulfillment || {
      mode: fulfillmentMode,
      restaurantId: order.restaurant_id,
      pickupTime: order.pickup_time,
      streetAddress: order.delivery_address,
      postalCode: order.delivery_postal_code,
      recipientPhone: order.recipient_phone,
      deliveryInstructions: order.delivery_instructions,
    },
    drinksCount,
    drinks: order.drinks || (order.order_items ? order.order_items.map(item => ({
      flavourName: item.flavour_name_snapshot,
      flavourId: item.flavour_id,
      consistencyName: item.consistency_name_snapshot,
      consistencyId: item.consistency_id,
      toppingName: item.topping_name_snapshot,
      toppingId: item.topping_id,
      cost: item.item_total,
    })) : []),
    subtotal: Number(subtotal.toFixed(2)),
    vat: Number(vat.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    deliveryFee: Number(deliveryFee.toFixed(2)),
    total: Number(total.toFixed(2)),
    createdAt,
  };
}

/**
 * Evaluates whether an order matches the provided multi-criteria filters.
 * @param {Object} order
 * @param {Object} filters
 * @returns {boolean}
 */
export function matchesOrderFilters(order, filters = {}) {
  const norm = normalizeOrderRecord(order);

  // 1. Date filtering
  const orderTime = new Date(norm.createdAt).getTime();

  if (filters.datePreset) {
    const now = Date.now();
    if (filters.datePreset === REPORT_DATE_PRESETS.TODAY) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      if (orderTime < todayStart.getTime()) return false;
    } else if (filters.datePreset === REPORT_DATE_PRESETS.LAST_7_DAYS) {
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      if (orderTime < sevenDaysAgo) return false;
    } else if (filters.datePreset === REPORT_DATE_PRESETS.LAST_30_DAYS) {
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      if (orderTime < thirtyDaysAgo) return false;
    }
  }

  if (filters.startDate) {
    const start = new Date(filters.startDate).getTime();
    if (orderTime < start) return false;
  }

  if (filters.endDate) {
    const end = new Date(filters.endDate).getTime();
    if (orderTime > end) return false;
  }

  // 2. Status filtering
  if (filters.status && filters.status !== 'ALL') {
    const allowed = Array.isArray(filters.status) ? filters.status : [filters.status];
    if (!allowed.includes(norm.status)) return false;
  }

  // 3. Fulfillment mode filtering
  if (filters.fulfillmentMode && filters.fulfillmentMode !== 'ALL') {
    if (norm.fulfillmentMode !== filters.fulfillmentMode) return false;
  }

  // 4. Product / Flavor popularity filtering
  if (filters.flavour && filters.flavour !== 'ALL') {
    const target = String(filters.flavour).toLowerCase().trim();
    const hasFlavour = norm.drinks.some((d) => {
      const name = String(d.flavourName || d.flavour || '').toLowerCase();
      const id = String(d.flavourId || '').toLowerCase();
      return name.includes(target) || id === target;
    });
    if (!hasFlavour) return false;
  }

  // 5. Toppings filtering
  if (filters.topping && filters.topping !== 'ALL') {
    const target = String(filters.topping).toLowerCase().trim();
    const hasTopping = norm.drinks.some((d) => {
      const name = String(d.toppingName || d.topping || '').toLowerCase();
      const id = String(d.toppingId || '').toLowerCase();
      return name.includes(target) || id === target;
    });
    if (!hasTopping) return false;
  }

  // 6. Price range thresholds
  if (filters.minTotal !== undefined && filters.minTotal !== null && filters.minTotal !== '') {
    if (norm.total < Number(filters.minTotal)) return false;
  }

  if (filters.maxTotal !== undefined && filters.maxTotal !== null && filters.maxTotal !== '') {
    if (norm.total > Number(filters.maxTotal)) return false;
  }

  // 7. Search keyword
  if (filters.searchTerm && filters.searchTerm.trim() !== '') {
    const q = filters.searchTerm.toLowerCase().trim();
    const matchOrderNum = norm.orderNumber?.toLowerCase().includes(q);
    const matchEmail = norm.customerEmail?.toLowerCase().includes(q);
    const matchPhone = norm.fulfillment?.recipientPhone?.toLowerCase().includes(q);
    const matchId = norm.id?.toLowerCase().includes(q);
    if (!matchOrderNum && !matchEmail && !matchPhone && !matchId) return false;
  }

  return true;
}

/**
 * Filters an array of orders according to multi-criteria clever filters.
 * @param {Object[]} orders
 * @param {Object} filters
 * @returns {Object[]}
 */
export function filterOrders(orders = [], filters = {}) {
  return orders
    .map(normalizeOrderRecord)
    .filter((order) => matchesOrderFilters(order, filters))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Computes aggregated summary metrics from a collection of orders.
 * @param {Object[]} orders
 * @returns {Object}
 */
export function calculateAggregatedMetrics(orders = []) {
  const normalized = orders.map(normalizeOrderRecord);
  const totalOrders = normalized.length;

  let grossRevenue = 0;
  let paidOrdersCount = 0;
  let pickupCount = 0;
  let deliveryCount = 0;

  const statusBreakdown = {
    PAID: 0,
    PENDING_PAYMENT: 0,
    PREPARING: 0,
    READY: 0,
    COLLECTED: 0,
    CANCELLED: 0,
  };

  const flavourCounts = {};
  const toppingCounts = {};

  for (const o of normalized) {
    if (o.status === ORDER_STATUS.PAID || o.status === ORDER_STATUS.PREPARING || o.status === ORDER_STATUS.READY || o.status === ORDER_STATUS.COLLECTED) {
      grossRevenue += o.total;
      paidOrdersCount += 1;
    }

    if (statusBreakdown[o.status] !== undefined) {
      statusBreakdown[o.status] += 1;
    } else {
      statusBreakdown[o.status] = 1;
    }

    if (o.fulfillmentMode === FULFILLMENT_MODES.DELIVERY) {
      deliveryCount += 1;
    } else {
      pickupCount += 1;
    }

    for (const d of o.drinks) {
      const flavour = d.flavourName || 'Standard Flavour';
      flavourCounts[flavour] = (flavourCounts[flavour] || 0) + 1;

      const topping = d.toppingName || 'No Topping';
      toppingCounts[topping] = (toppingCounts[topping] || 0) + 1;
    }
  }

  const averageOrderValue = paidOrdersCount > 0 ? Number((grossRevenue / paidOrdersCount).toFixed(2)) : 0;
  const pickupPercentage = totalOrders > 0 ? Number(((pickupCount / totalOrders) * 100).toFixed(1)) : 0;
  const deliveryPercentage = totalOrders > 0 ? Number(((deliveryCount / totalOrders) * 100).toFixed(1)) : 0;

  const topFlavours = Object.entries(flavourCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const topToppings = Object.entries(toppingCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalOrders,
    grossRevenue: Number(grossRevenue.toFixed(2)),
    paidOrdersCount,
    averageOrderValue,
    fulfillment: {
      pickupCount,
      deliveryCount,
      pickupPercentage,
      deliveryPercentage,
    },
    statusBreakdown,
    topFlavours,
    topToppings,
  };
}

/**
 * Sanitizes an order record for administrative reporting.
 * Excludes internal database keys or sensitive auth data.
 * @param {Object} order
 * @returns {Object}
 */
export function sanitizeOrderForAdmin(order) {
  const norm = normalizeOrderRecord(order);
  return {
    id: norm.id,
    orderNumber: norm.orderNumber,
    customerEmail: norm.customerEmail,
    status: norm.status,
    fulfillmentMode: norm.fulfillmentMode,
    fulfillmentDetails: {
      mode: norm.fulfillment.mode,
      restaurantId: norm.fulfillment.restaurantId,
      pickupTime: norm.fulfillment.pickupTime,
      destinationAddress: norm.fulfillment.streetAddress || null,
      postalCode: norm.fulfillment.postalCode || null,
      recipientPhone: norm.fulfillment.recipientPhone || null,
    },
    drinksCount: norm.drinksCount,
    drinks: norm.drinks.map((d) => ({
      flavour: d.flavourName || 'Custom',
      consistency: d.consistencyName || 'Standard',
      topping: d.toppingName || 'None',
      cost: d.cost,
    })),
    subtotal: norm.subtotal,
    vat: norm.vat,
    discount: norm.discount,
    deliveryFee: norm.deliveryFee,
    total: norm.total,
    createdAt: norm.createdAt,
  };
}

/**
 * Generates an RFC 4180 compliant CSV string from an array of orders.
 * @param {Object[]} orders
 * @returns {string}
 */
export function generateOrdersCsv(orders = []) {
  const headers = [
    'Order Number',
    'Created At',
    'Customer Email',
    'Status',
    'Fulfillment Mode',
    'Drinks Count',
    'Subtotal (ZAR)',
    'VAT (ZAR)',
    'Discount (ZAR)',
    'Delivery Fee (ZAR)',
    'Total (ZAR)',
  ];

  const escapeCsv = (val) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = orders.map((o) => {
    const norm = normalizeOrderRecord(o);
    return [
      escapeCsv(norm.orderNumber),
      escapeCsv(norm.createdAt),
      escapeCsv(norm.customerEmail),
      escapeCsv(norm.status),
      escapeCsv(norm.fulfillmentMode),
      norm.drinksCount,
      norm.subtotal.toFixed(2),
      norm.vat.toFixed(2),
      norm.discount.toFixed(2),
      norm.deliveryFee.toFixed(2),
      norm.total.toFixed(2),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}
