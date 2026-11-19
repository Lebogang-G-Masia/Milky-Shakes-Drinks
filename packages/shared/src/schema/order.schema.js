import { MIN_DRINKS_PER_ORDER, MAX_DRINKS_PER_ORDER, FULFILLMENT_MODES } from '../constraints/rules.js';

export function validateOrder(order) {
  const errors = [];
  if (!order) {
    return ['Order payload is required'];
  }
  if (!order.fulfillmentMode || !Object.values(FULFILLMENT_MODES).includes(order.fulfillmentMode)) {
    errors.push('Valid fulfillment mode (PICKUP or DELIVERY) is required');
  }
  if (!Array.isArray(order.drinks) || order.drinks.length < MIN_DRINKS_PER_ORDER || order.drinks.length > MAX_DRINKS_PER_ORDER) {
    errors.push(`Order must contain between ${MIN_DRINKS_PER_ORDER} and ${MAX_DRINKS_PER_ORDER} drinks`);
  }
  return errors;
}
