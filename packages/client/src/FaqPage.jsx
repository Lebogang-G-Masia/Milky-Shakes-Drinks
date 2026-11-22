import React, { useState, useEffect } from 'react';
import { useRouter } from './router';
import { getDraftFilledCount } from './orderDraft';
import { FAQ_ITEMS } from './LandingPage';
import './OrderPlacement.css';

export default function FaqPage({ currentUser, onSignOut }) {
  const { navigate } = useRouter();
  const [cartCount, setCartCount] = useState(() => getDraftFilledCount());
  const [openIds, setOpenIds] = useState(new Set(['different']));

  useEffect(() => {
    const handleUpdate = () => setCartCount(getDraftFilledCount());
    window.addEventListener('milky_draft_updated', handleUpdate);
    return () => window.removeEventListener('milky_draft_updated', handleUpdate);
  }, []);

  const toggleItem = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allFaqs = [
    {
      id: 'different',
      question: 'What makes your milkshake different?',
      answer:
        'We use 100% pasture-raised whole milk, fresh farm cream, and genuine tropical fruits and berries. Every batch is handcrafted in small quantities with zero artificial flavours, chemical thickeners, or preservatives.',
    },
    {
      id: 'coldlock',
      question: 'How do you guarantee the shakes stay cold and thick during delivery?',
      answer:
        'Every multi-pack carry crate is packed with food-grade dry-chill thermal inserts engineered to hold sub-zero temperatures for up to 60 minutes. Your shakes arrive frosted, thick, and spoonable.',
    },
    {
      id: 'custompack',
      question: 'Can I mix and match different flavours in a single pack?',
      answer:
        'Yes! With our Artisan Box Builder, you can independently configure each individual slot in your 2-Pack, 4-Pack, or 6-Pack crate with its own unique base flavour, consistency, and topping.',
    },
    {
      id: 'discounts',
      question: 'How do the volume bundle discounts work?',
      answer:
        'Our discount tiers apply automatically at checkout: 4-Pack orders enjoy an automatic 10% volume discount, and 6-Pack crates enjoy 15% off. You can also enter promotional discount codes.',
    },
    {
      id: 'pickup_vs_delivery',
      question: 'What fulfillment channels are available?',
      answer:
        'We offer both immediate or scheduled Store Pickup at our flagship artisan locations (completely free of charge) and expedited refrigerated courier delivery directly to your residential or office address.',
    },
  ];

  return (
    <div className="box-builder-canvas">
      {/* Top Header / Navigation Bar */}
      <header className="box-nav-header">
        <div
          className="box-nav-logo"
          onClick={() => navigate('/')}
          role="button"
          tabIndex={0}
          title="milky"
        >
          milky
        </div>

        {/* Centered Floating Pill Navigation */}
        <nav className="box-nav-pill-menu" aria-label="Main Navigation">
          {[
            { label: 'Home', path: '/' },
            { label: 'Orders', path: '/orders' },
            { label: 'Flavours', path: '/flavours' },
            { label: 'Philosophy', path: '/philosophy' },
          ].map((tab) => {
            return (
              <button
                key={tab.label}
                className="box-nav-pill-item"
                onClick={() => navigate(tab.path)}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right Action Icons / Buttons */}
        <div className="box-nav-actions">
          <button
            type="button"
            className="box-btn-ghost-pill cart-btn"
            onClick={() => navigate('/orders')}
            aria-label="View shopping cart"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span>Cart ({cartCount})</span>
          </button>

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
              onClick={() => navigate('/auth?returnUrl=/faq')}
              title="Sign In"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main FAQ Content */}
      <main className="box-main-content">
        <div style={{ textAlign: 'center', maxWidth: '800px', margin: '20px auto 40px' }}>
          <h1 className="box-page-title" style={{ fontSize: '38px', marginBottom: '12px' }}>
            Frequently Asked Questions
          </h1>
          <p className="box-page-subtitle" style={{ fontSize: '16px', lineHeight: 1.6 }}>
            Everything you need to know about our ingredients, cold-lock fulfillment, and artisan box orders.
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div style={{ maxWidth: '820px', margin: '0 auto 60px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {allFaqs.map((item) => {
            const isOpen = openIds.has(item.id);
            return (
              <div
                key={item.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '18px',
                  border: '1.5px solid #E8D9C5',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.2s ease',
                  boxShadow: isOpen ? '0 6px 20px rgba(56, 31, 21, 0.06)' : 'none',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  style={{
                    width: '100%',
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '16px', fontWeight: '800', color: '#381F15', paddingRight: '16px' }}>
                    {item.question}
                  </span>
                  <span
                    style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#BA724C',
                      transform: isOpen ? 'rotate(45deg)' : 'none',
                      transition: 'transform 0.2s ease',
                      display: 'inline-block',
                    }}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 24px 22px', fontSize: '14.5px', color: '#7C6053', lineHeight: 1.65 }}>
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', padding: '30px 20px 60px' }}>
          <button
            type="button"
            className="btn-final-checkout"
            onClick={() => navigate('/orders')}
            style={{ maxWidth: '280px', margin: '0 auto' }}
          >
            Start Your Custom Order &rarr;
          </button>
        </div>
      </main>
    </div>
  );
}
