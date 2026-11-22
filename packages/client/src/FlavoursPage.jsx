import React, { useState, useEffect } from 'react';
import { useRouter } from './router';
import { getDraftFilledCount, loadOrderDraft, saveOrderDraft } from './orderDraft';
import { FLAVORS, SIGNATURE_FLAVOURS } from './LandingPage';
import './OrderPlacement.css';

export default function FlavoursPage({ currentUser, onSignOut }) {
  const { navigate } = useRouter();
  const [cartCount, setCartCount] = useState(() => getDraftFilledCount());
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'CLASSIC' | 'FRUIT' | 'MINT'

  useEffect(() => {
    const handleUpdate = () => setCartCount(getDraftFilledCount());
    window.addEventListener('milky_draft_updated', handleUpdate);
    return () => window.removeEventListener('milky_draft_updated', handleUpdate);
  }, []);

  const flavoursList = [
    {
      id: 'cookies',
      name: 'Cookies & Kräm',
      category: 'CLASSIC',
      price: 'R65.00',
      tagline: 'Dark cocoa biscuit crumbles folded into velvety double cream',
      profile: ['Madagascar Vanilla', 'House-baked Cookie Crumb', 'Dark Cocoa'],
      image: '/images/hero-spotlight-milkshake.png',
      alt: 'Cookies and Cream Artisan Milkshake',
      pairing: 'Pairs perfectly with Whipped Marshmallow topping',
    },
    {
      id: 'strawberry',
      name: 'Wild Strawbar',
      category: 'FRUIT',
      price: 'R60.00',
      tagline: 'Sun-ripened organic strawberries whipped into silky dairy bliss',
      profile: ['Organic Strawberry Coulis', 'Fresh Whole Milk', 'Pure Cane'],
      image: '/images/Strawberry.png',
      alt: 'Wild Strawberry Artisan Milkshake',
      pairing: 'Pairs perfectly with Fresh Strawberry Glaze & Sprinkles',
    },
    {
      id: 'mint',
      name: 'Mint Choklad',
      category: 'MINT',
      price: 'R70.00',
      tagline: 'Crisp garden mint infused with single-origin dark chocolate chips',
      profile: ['Cold-pressed Garden Mint', '70% Dark Cocoa Nibs', 'Double Cream'],
      image: '/images/mint.png',
      alt: 'Mint Chocolate Chip Artisan Milkshake',
      pairing: 'Pairs perfectly with Dark Chocolate Fudge Dip',
    },
  ];

  const filteredFlavours = filter === 'ALL'
    ? flavoursList
    : flavoursList.filter((f) => f.category === filter);

  function handleSelectFlavourForBox(flavourItem) {
    const currentDraft = loadOrderDraft() || {
      packSize: 4,
      drinks: [
        { id: 1, flavourId: '', consistencyId: '', toppingId: '', cost: 0 },
        { id: 2, flavourId: '', consistencyId: '', toppingId: '', cost: 0 },
        { id: 3, flavourId: '', consistencyId: '', toppingId: '', cost: 0 },
        { id: 4, flavourId: '', consistencyId: '', toppingId: '', cost: 0 },
      ],
      activeSlotIndex: 0,
      currentStage: 'builder',
      fulfillmentMode: 'PICKUP',
    };

    // Put selected flavour into the first unfilled slot, or slot 1
    const targetIdx = currentDraft.drinks.findIndex((d) => !d.flavourId);
    const slotIdx = targetIdx >= 0 ? targetIdx : 0;

    currentDraft.drinks[slotIdx] = {
      ...currentDraft.drinks[slotIdx],
      // Use fallback matching string for database compatibility
      flavourId: flavourItem.id,
      consistencyId: currentDraft.drinks[slotIdx].consistencyId || '',
      toppingId: currentDraft.drinks[slotIdx].toppingId || '',
    };
    currentDraft.activeSlotIndex = slotIdx;

    saveOrderDraft(currentDraft);
    navigate('/orders');
  }

  return (
    <div className="box-builder-canvas">
      {/* Top Navigation Bar */}
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

        {/* Centered Floating Pill Navigation */}
        <nav className="box-nav-pill-menu" aria-label="Main Navigation">
          {[
            { label: 'Home', path: '/' },
            { label: 'Orders', path: '/orders' },
            { label: 'Flavours', path: '/flavours' },
            { label: 'Philosophy', path: '/philosophy' },
          ].map((tab) => {
            const isActive = tab.label === 'Flavours';
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
              onClick={() => navigate('/auth?returnUrl=/flavours')}
              title="Sign In"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Flavours Showcase Content */}
      <main className="box-main-content">
        <div style={{ textAlign: 'center', maxWidth: '800px', margin: '20px auto 40px' }}>
          <div className="deck-header-badge" style={{ display: 'inline-flex', marginBottom: '12px' }}>
            Handcrafted in Small Batches
          </div>
          <h1 className="box-page-title" style={{ fontSize: '38px', marginBottom: '12px' }}>
            Our Artisan Flavours
          </h1>
          <p className="box-page-subtitle" style={{ fontSize: '16px', lineHeight: 1.6 }}>
            Every shake starts with whole grass-fed organic milk, slow-churned sweet dairy, and genuine inclusions.
            Choose any flavour to craft your custom carry box.
          </p>

          {/* Filter Pills */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Recipes' },
              { id: 'CLASSIC', label: 'Decadent Classics' },
              { id: 'FRUIT', label: 'Fresh Berry & Fruit' },
              { id: 'MINT', label: 'Garden Infusions' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '9999px',
                  border: filter === f.id ? '1.5px solid #BA724C' : '1.5px solid #E8D9C5',
                  background: filter === f.id ? '#BA724C' : '#FFFFFF',
                  color: filter === f.id ? '#FFFFFF' : '#381F15',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: filter === f.id ? '0 2px 8px rgba(186, 114, 76, 0.25)' : 'none',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Flavours Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
            maxWidth: '1200px',
            margin: '0 auto 60px',
          }}
        >
          {filteredFlavours.map((item) => (
            <div
              key={item.id}
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                border: '1.5px solid #E8D9C5',
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 8px 24px rgba(56, 31, 21, 0.05)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              <div>
                <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                  <img
                    src={item.image}
                    alt={item.alt}
                    style={{
                      maxHeight: '210px',
                      maxWidth: '100%',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 14px 20px rgba(56, 31, 21, 0.2))',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#381F15', margin: 0 }}>
                    {item.name}
                  </h2>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#BA724C', background: '#FDF6EC', padding: '4px 12px', borderRadius: '9999px', border: '1px solid #E8D9C5' }}>
                    {item.price}
                  </span>
                </div>

                <p style={{ fontSize: '13.5px', color: '#7C6053', lineHeight: 1.55, margin: '0 0 16px 0' }}>
                  {item.tagline}
                </p>

                {/* Flavor Notes */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                  {item.profile.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontSize: '11.5px',
                        fontWeight: '700',
                        color: '#381F15',
                        background: '#FAF4EC',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        border: '1px solid #E8D9C5',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div style={{ fontSize: '12px', color: '#2D7D54', background: '#E8F8F0', padding: '8px 12px', borderRadius: '10px', marginBottom: '20px' }}>
                  {item.pairing}
                </div>
              </div>

              <button
                type="button"
                className="btn-final-checkout"
                onClick={() => handleSelectFlavourForBox(item)}
                style={{ width: '100%', marginTop: 'auto' }}
              >
                Add to Carry Box & Customize &rarr;
              </button>
            </div>
          ))}
        </div>

        {/* Bottom Banner */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1.5px solid #E8D9C5',
            borderRadius: '24px',
            padding: '36px',
            textAlign: 'center',
            maxWidth: '860px',
            margin: '0 auto',
            boxShadow: '0 8px 24px rgba(56, 31, 21, 0.04)',
          }}
        >
          <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#381F15', margin: '0 0 8px 0' }}>
            Build Your Multi-Flavour Box
          </h3>
          <p style={{ fontSize: '14px', color: '#7C6053', maxWidth: '600px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            Mix and match up to 6 different milkshakes in one insulated cold-lock box. Enjoy volume discounts of up to 15% off.
          </p>
          <button
            type="button"
            className="btn-final-checkout"
            onClick={() => navigate('/orders')}
            style={{ maxWidth: '280px', margin: '0 auto' }}
          >
            Open Box Builder &rarr;
          </button>
        </div>
      </main>
    </div>
  );
}
