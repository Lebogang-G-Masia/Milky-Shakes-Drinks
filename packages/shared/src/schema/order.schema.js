import { MIN_DRINKS_PER_ORDER, MAX_DRINKS_PER_ORDER, FULFILLMENT_MODES, DEFAULT_VAT_RATE } from '../constraints/rules.js';

export function validateDrinkItem(drink, index = 0) {
  const errors = [];
  const label = `Milkshake ${index + 1}`;

  if (!drink) {
    return [`${label}: Drink configuration is required`];
  }
  if (!drink.flavourId) {
    errors.push(`${label}: Flavour selection is required`);
  }
  if (!drink.consistencyId) {
    errors.push(`${label}: 'Thick or Not' consistency selection is required`);
  }
  if (!drink.toppingId) {
    errors.push(`${label}: Topping selection is required`);
  }
  return errors;
}

export function validateOrder(order) {
  const errors = [];
  if (!order) {
    return ['Order payload is required'];
  }
  if (order.fulfillmentMode && !Object.values(FULFILLMENT_MODES).includes(order.fulfillmentMode)) {
    errors.push('Valid fulfillment mode (PICKUP or DELIVERY) is required');
  }
  if (!Array.isArray(order.drinks) || order.drinks.length < MIN_DRINKS_PER_ORDER || order.drinks.length > MAX_DRINKS_PER_ORDER) {
    errors.push(`Order must contain between ${MIN_DRINKS_PER_ORDER} and ${MAX_DRINKS_PER_ORDER} drinks`);
  } else {
    order.drinks.forEach((drink, idx) => {
      errors.push(...validateDrinkItem(drink, idx));
    });
  }
  return errors;
}

export function calculateOrderTotals(drinks = [], discountTier = null, vatRate = DEFAULT_VAT_RATE) {
  let subtotal = 0;

  for (const drink of drinks) {
    const cost = Number(drink?.cost || 0);
    subtotal += isNaN(cost) ? 0 : cost;
  }

  // Round subtotal to 2 decimal places
  subtotal = Math.round(subtotal * 100) / 100;

  // Calculate VAT (15%)
  const vat = Math.round(subtotal * vatRate * 100) / 100;

  // Calculate Discount if applicable
  let discountAmount = 0;
  if (discountTier) {
    if (typeof discountTier.discount_percent === 'number' && discountTier.discount_percent > 0) {
      discountAmount = Math.round(subtotal * (discountTier.discount_percent / 100) * 100) / 100;
    } else if (typeof discountTier.discount_amount === 'number' && discountTier.discount_amount > 0) {
      discountAmount = Math.min(subtotal, Math.round(discountTier.discount_amount * 100) / 100);
    }
  }

  // Total Cost = Subtotal + VAT - Discount
  const total = Math.max(0, Math.round((subtotal + vat - discountAmount) * 100) / 100);

  return {
    subtotal,
    vat,
    vatRate,
    discountAmount,
    total,
  };
}

export function formatCurrency(amount) {
  const val = Number(amount || 0);
  return `R${val.toFixed(2)}`;
}
