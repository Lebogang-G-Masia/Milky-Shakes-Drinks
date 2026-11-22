export const ORDER_DRAFT_KEY = 'milky_active_order_draft';

export function saveOrderDraft(draft) {
  try {
    if (!draft) return;
    localStorage.setItem(ORDER_DRAFT_KEY, JSON.stringify(draft));
    // Dispatch custom event so navbars on any page immediately update cart count
    window.dispatchEvent(new Event('milky_draft_updated'));
  } catch (e) {
    console.warn('Failed to save order draft to localStorage:', e);
  }
}

export function loadOrderDraft() {
  try {
    const raw = localStorage.getItem(ORDER_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load order draft from localStorage:', e);
    return null;
  }
}

export function clearOrderDraft() {
  try {
    localStorage.removeItem(ORDER_DRAFT_KEY);
    window.dispatchEvent(new Event('milky_draft_updated'));
  } catch (e) {
    console.warn('Failed to clear order draft from localStorage:', e);
  }
}

export function getDraftFilledCount() {
  const draft = loadOrderDraft();
  if (!draft || !Array.isArray(draft.drinks)) return 0;
  return draft.drinks.filter((d) => d && d.flavourId && d.consistencyId).length;
}
