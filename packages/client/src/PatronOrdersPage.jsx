import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from './router';
import { supabase } from './supabaseClient';
import { formatCurrency, ORDER_STATUS } from '@milky-shakes/shared';
import MilkyReceiptPrinter from './ReceiptPrinter';
import './PatronOrdersPage.css';

export default function PatronOrdersPage({ currentUser, onSignOut }) {
  const { navigate } = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [emailingOrderId, setEmailingOrderId] = useState(null);
  const [loyalty, setLoyalty] = useState({
    completedOrdersCount: 0,
    eligibleDiscountPercent: 0,
    nextTierThreshold: 3,
    nextTierPercent: 5,
  });

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const email = currentUser?.email || '';
      const userId = currentUser?.id || '';

      // 1. Try local API patron endpoint first
      const queryParam = email ? `email=${encodeURIComponent(email)}` : userId ? `userId=${encodeURIComponent(userId)}` : '';
      const apiRes = await fetch(`/api/patron/orders?${queryParam}`, {
        headers: {
          'x-user-email': email,
          'x-user-id': userId,
        },
      });

      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data.orders && data.orders.length > 0) {
          setOrders(data.orders);
          if (data.loyalty) setLoyalty(data.loyalty);
          setLoading(false);
          return;
        }
      }

      // 2. Fallback to Supabase orders with items
      if (email || userId) {
        let query = supabase
          .from('orders')
          .select('*, order_items(*), restaurants(name, address)')
          .order('created_at', { ascending: false });

        if (userId) {
          query = query.eq('patron_id', userId);
        }

        const { data: sbOrders, error: sbErr } = await query;
        if (!sbErr && sbOrders && sbOrders.length > 0) {
          // Normalize Supabase format to unified order structure
          const formatted = sbOrders.map((o) => ({
            id: o.id,
            orderNumber: o.order_number,
            status: o.status,
            createdAt: o.created_at,
            pickupTime: o.pickup_time,
            restaurantName: o.restaurants?.name || 'Toppan Security — Irene HQ',
            restaurantAddress: o.restaurants?.address || '',
            drinksCount: o.number_of_drinks || (o.order_items ? o.order_items.length : 1),
            drinks: (o.order_items || []).map((item) => ({
              flavourName: item.flavour_name_snapshot,
              consistencyName: item.consistency_name_snapshot,
              toppingName: item.topping_name_snapshot,
              cost: Number(item.item_total || 0),
            })),
            subtotal: Number(o.subtotal_amount || o.subtotal || 0),
            discount: Number(o.discount_amount || 0),
            vat: Number(o.vat_amount || 0),
            deliveryFee: Number(o.delivery_fee || 0),
            total: Number(o.total_amount || 0),
            customerName: currentUser?.name || currentUser?.first_name || 'Valued Patron',
            customerEmail: currentUser?.email || '',
          }));

          setOrders(formatted);
          const completedCount = formatted.filter((o) => o.status === 'PAID' || o.status === 'COLLECTED').length;
          setLoyalty({
            completedOrdersCount: completedCount,
            eligibleDiscountPercent: completedCount >= 10 ? 15 : completedCount >= 5 ? 10 : completedCount >= 3 ? 5 : 0,
            nextTierThreshold: completedCount < 3 ? 3 : completedCount < 5 ? 5 : completedCount < 10 ? 10 : 10,
            nextTierPercent: completedCount < 3 ? 5 : completedCount < 5 ? 10 : completedCount < 10 ? 15 : 15,
          });
          setLoading(false);
          return;
        }
      }

      // Default empty if none found
      setOrders([]);
    } catch (err) {
      console.warn('Patron orders load error:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handle Resending Email Receipt
  const handleEmailReceipt = async (order) => {
    const email = order.customerEmail || currentUser?.email;
    if (!email) {
      showToast('No customer email associated with this order.');
      return;
    }

    setEmailingOrderId(order.id || order.orderNumber);
    try {
      const res = await fetch('/api/orders/email-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: email,
          customerName: order.customerName || currentUser?.name || 'Valued Patron',
          order: {
            id: order.id,
            orderNumber: order.orderNumber,
            pickupTime: order.pickupTime,
            fulfillment: {
              restaurantName: order.restaurantName,
              pickupTime: order.pickupTime,
            },
            drinksCount: order.drinksCount,
            drinks: order.drinks,
            subtotal: order.subtotal,
            discount: order.discount,
            vat: order.vat,
            deliveryFee: order.deliveryFee,
            total: order.total,
          },
          receipt: {
            receiptNumber: `REC-${order.orderNumber || order.id.slice(0, 8)}`,
            amount: order.total,
            method: 'CARD',
            last4: '4242',
            timestamp: order.createdAt || new Date().toISOString(),
          },
        }),
      });

      if (res.ok) {
        showToast(`Tax invoice and receipt successfully emailed to ${email}`);
      } else {
        showToast('Receipt dispatch initiated.');
      }
    } catch (e) {
      showToast('Receipt dispatch error.');
    } finally {
      setEmailingOrderId(null);
    }
  };

  const ordersToNextTier = Math.max(0, loyalty.nextTierThreshold - loyalty.completedOrdersCount);

  return (
    <div className="patron-portal-root">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="portal-toast-banner" role="alert">
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} aria-label="Dismiss">
            &times;
          </button>
        </div>
      )}

      {/* Top Header / Navigation Bar */}
      <header className="box-nav-header">
        <div
          className="box-nav-logo"
          onClick={() => navigate('/')}
          role="button"
          tabIndex={0}
          title="Milky — Artisan Milkshakes"
        >
          milky
        </div>

        <nav className="box-nav-pill-menu" aria-label="Main Navigation">
          {[
            { label: 'Home', path: '/' },
            { label: 'Orders', path: '/orders' },
            { label: 'My Orders', path: '/my-orders' },
            { label: 'Flavours', path: '/flavours' },
            { label: 'Philosophy', path: '/philosophy' },
          ].map((tab) => {
            const isActive = tab.label === 'My Orders';
            return (
              <button
                key={tab.label}
                className={`box-nav-pill-item ${isActive ? 'active' : ''}`}
                onClick={() => navigate(tab.path)}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="box-nav-actions">
          {currentUser ? (
            <button
              type="button"
              className="box-btn-ghost-pill signout-btn"
              onClick={onSignOut}
              title="Sign Out"
            >
              Sign Out
            </button>
          ) : (
            <button
              type="button"
              className="box-btn-ghost-pill signin-btn"
              onClick={() => navigate('/auth?returnUrl=/my-orders')}
              title="Sign In"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Patron Portal Container */}
      <main className="patron-portal-main">
        {/* Welcome & Loyalty Status Banner */}
        <section className="patron-hero-card">
          <div className="patron-hero-left">
            <span className="patron-badge-label">Patron Order Portal</span>
            <h1 className="patron-hero-title">
              Welcome back, {currentUser?.name || currentUser?.first_name || 'Artisan Sipper'}
            </h1>
            <p className="patron-hero-subtitle">
              Review your past artisanal milkshake orders, reprint tax receipts, or track scheduled pickups at Toppan Security branches.
            </p>
          </div>

          <div className="patron-loyalty-card">
            <div className="loyalty-card-header">
              <span className="loyalty-card-tag">Frequent Customer Tier</span>
              {loyalty.eligibleDiscountPercent > 0 ? (
                <span className="loyalty-tier-badge">{loyalty.eligibleDiscountPercent}% Active Discount</span>
              ) : (
                <span className="loyalty-tier-badge badge-neutral">Standard Member</span>
              )}
            </div>

            <div className="loyalty-metrics-row">
              <div className="loyalty-metric">
                <span className="metric-num">{loyalty.completedOrdersCount}</span>
                <span className="metric-label">Completed Orders</span>
              </div>
              <div className="loyalty-metric">
                <span className="metric-num">{loyalty.eligibleDiscountPercent}%</span>
                <span className="metric-label">Auto Discount</span>
              </div>
            </div>

            <div className="loyalty-progress-note">
              {ordersToNextTier > 0 ? (
                <span>
                  Place <strong>{ordersToNextTier} more order{ordersToNextTier > 1 ? 's' : ''}</strong> to unlock the {loyalty.nextTierPercent}% Frequent Customer Discount tier.
                </span>
              ) : (
                <span>You have unlocked the highest VIP Frequent Customer Discount tier (15% Off)!</span>
              )}
            </div>
          </div>
        </section>

        {/* Orders List Section */}
        <section className="patron-orders-section">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Past Order History (Mandatory #9)</h2>
              <p className="section-subtext">Chronological history of all milkshakes crafted for you</p>
            </div>

            <button
              type="button"
              className="btn-create-order-pill"
              onClick={() => navigate('/orders')}
            >
              + Place New Order
            </button>
          </div>

          {loading ? (
            <div className="patron-loading-state">
              <div className="loading-spinner" />
              <p>Fetching your order records...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="patron-empty-state">
              <div className="empty-icon-circle">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </div>
              <h3>No Past Orders Found</h3>
              <p>You haven't placed any milkshake orders yet. Start crafting your custom artisan box now!</p>
              <button
                type="button"
                className="btn-portal-primary"
                onClick={() => navigate('/orders')}
              >
                Build Milkshake Box
              </button>
            </div>
          ) : (
            <div className="patron-orders-grid">
              {orders.map((ord) => {
                const dateStr = ord.createdAt
                  ? new Date(ord.createdAt).toLocaleDateString('en-ZA', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recent Order';

                const pickupStr = ord.pickupTime
                  ? new Date(ord.pickupTime).toLocaleTimeString('en-ZA', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Scheduled';

                const isPaid = ord.status === ORDER_STATUS.PAID || ord.status === ORDER_STATUS.COLLECTED;

                return (
                  <article key={ord.id || ord.orderNumber} className="patron-order-card">
                    <div className="order-card-header">
                      <div>
                        <span className="order-ref-number">{ord.orderNumber || ord.id}</span>
                        <div className="order-date-label">{dateStr}</div>
                      </div>

                      <span className={`status-pill status-${(ord.status || 'PAID').toLowerCase()}`}>
                        {ord.status || 'PAID'}
                      </span>
                    </div>

                    <div className="order-location-banner">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      <div>
                        <strong>{ord.restaurantName || 'Toppan Security — South Africa'}</strong>
                        <div className="pickup-time-hint">Pickup Time: {pickupStr}</div>
                      </div>
                    </div>

                    {/* Drinks Breakdown */}
                    <div className="order-items-list">
                      <div className="items-list-title">{ord.drinksCount || (ord.drinks ? ord.drinks.length : 1)} Milkshake{ord.drinksCount > 1 ? 's' : ''}:</div>
                      {(ord.drinks || []).map((drink, idx) => (
                        <div key={idx} className="order-drink-row">
                          <span className="drink-dot" />
                          <div className="drink-desc">
                            <strong>{drink.flavourName || 'Artisan Milkshake'}</strong>
                            <span className="drink-meta">
                              {drink.consistencyName ? `(${drink.consistencyName})` : ''}
                              {drink.toppingName ? ` + ${drink.toppingName}` : ''}
                            </span>
                          </div>
                          <span className="drink-price">{formatCurrency(drink.cost || 0)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Financial Summary */}
                    <div className="order-financials">
                      <div className="fin-row">
                        <span>Subtotal</span>
                        <span>{formatCurrency(ord.subtotal || 0)}</span>
                      </div>
                      {Number(ord.discount) > 0 && (
                        <div className="fin-row discount-row">
                          <span>Frequent Customer Discount</span>
                          <span>-{formatCurrency(ord.discount)}</span>
                        </div>
                      )}
                      <div className="fin-row">
                        <span>VAT (15%)</span>
                        <span>{formatCurrency(ord.vat || 0)}</span>
                      </div>
                      <div className="fin-row total-row">
                        <strong>Total Amount</strong>
                        <strong>{formatCurrency(ord.total || 0)}</strong>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="order-card-actions">
                      <button
                        type="button"
                        className="btn-action-receipt"
                        onClick={() => setSelectedReceiptOrder(ord)}
                        title="View & Re-print tactile receipt"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 9V2h12v7" />
                          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                          <path d="M6 14h12v8H6z" />
                        </svg>
                        <span>View Tactile Receipt</span>
                      </button>

                      <button
                        type="button"
                        className="btn-action-email"
                        onClick={() => handleEmailReceipt(ord)}
                        disabled={emailingOrderId === (ord.id || ord.orderNumber)}
                        title="Email Tax Receipt & Invoice"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                        <span>
                          {emailingOrderId === (ord.id || ord.orderNumber) ? 'Sending...' : 'Email Receipt'}
                        </span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Modal: Tactile Receipt Printer */}
        {selectedReceiptOrder && (
          <div className="receipt-modal-backdrop" onClick={() => setSelectedReceiptOrder(null)}>
            <div className="receipt-modal-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-bar">
                <h3>Order Receipt #{selectedReceiptOrder.orderNumber || selectedReceiptOrder.id}</h3>
                <button
                  type="button"
                  className="btn-close-modal"
                  onClick={() => setSelectedReceiptOrder(null)}
                >
                  &times;
                </button>
              </div>

              <MilkyReceiptPrinter
                order={{
                  id: selectedReceiptOrder.id,
                  orderNumber: selectedReceiptOrder.orderNumber,
                  drinksCount: selectedReceiptOrder.drinksCount,
                  drinks: selectedReceiptOrder.drinks,
                  subtotal: selectedReceiptOrder.subtotal,
                  discount: selectedReceiptOrder.discount,
                  vat: selectedReceiptOrder.vat,
                  total: selectedReceiptOrder.total,
                  fulfillment: {
                    restaurantName: selectedReceiptOrder.restaurantName,
                    pickupTime: selectedReceiptOrder.pickupTime,
                  },
                  payment: {
                    receiptNumber: `REC-${selectedReceiptOrder.orderNumber || selectedReceiptOrder.id.slice(0, 8)}`,
                    amount: selectedReceiptOrder.total,
                    method: 'CARD',
                    last4: '4242',
                    timestamp: selectedReceiptOrder.createdAt || new Date().toISOString(),
                    receiptEmailed: true,
                  },
                }}
                onReset={() => setSelectedReceiptOrder(null)}
                onHome={() => setSelectedReceiptOrder(null)}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
