import React, { useState, useEffect } from 'react';
import { useRouter } from './router';
import { getDraftFilledCount } from './orderDraft';
import './OrderPlacement.css';

export default function PhilosophyPage({ currentUser, onSignOut }) {
  const { navigate } = useRouter();
  const [cartCount, setCartCount] = useState(() => getDraftFilledCount());

  useEffect(() => {
    const handleUpdate = () => setCartCount(getDraftFilledCount());
    window.addEventListener('milky_draft_updated', handleUpdate);
    return () => window.removeEventListener('milky_draft_updated', handleUpdate);
  }, []);

  const pillars = [
    {
      title: 'Whole Grass-Fed Organic Dairy',
      sub: 'Pure cream, zero shortcuts',
      desc: 'We never cut corners with hydrogenated vegetable fats or reconstituted milk powders. Every shake begins with 100% certified pasture-raised whole milk and sweet double cream.',
    },
    {
      title: '60-Minute Sub-Zero Cold-Lock Guarantee',
      sub: 'Frosted thick texture, doorstep fresh',
      desc: 'Our insulated artisan crates feature food-grade dry-chill cold packs engineered to sustain sub-zero core temperatures during transit, ensuring your shake never arrives lukewarm or runny.',
    },
    {
      title: 'Small-Batch Scratch Made Inclusions',
      sub: 'Simmered fruit & freshly baked crunch',
      desc: 'Our strawberry coulis is simmered down daily from whole sun-ripened organic fruit, and our cocoa cookies are baked fresh each morning. Zero high-fructose corn syrups or synthetic dyes.',
    },
    {
      title: '100% Biodegradable & Recyclable Packaging',
      sub: 'Thoughtful indulgence without the guilt',
      desc: 'From our fluted carry boxes to our plant-based straws and reusable chill packs, every piece of our packaging is selected for low planetary footprint and effortless curbside recycling.',
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
            const isActive = tab.label === 'Philosophy';
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
              onClick={() => navigate('/auth?returnUrl=/philosophy')}
              title="Sign In"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Philosophy Content */}
      <main className="box-main-content">
        <div style={{ textAlign: 'center', maxWidth: '800px', margin: '20px auto 40px' }}>
          <h1 className="box-page-title" style={{ fontSize: '38px', marginBottom: '12px' }}>
            The Milky Philosophy
          </h1>
          <p className="box-page-subtitle" style={{ fontSize: '16px', lineHeight: 1.6 }}>
            We believe a milkshake should never be a frozen afterthought made from powders and artificial flavor pumps.
            Here is how we bring uncompromising craftsmanship back into every sip.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            maxWidth: '1200px',
            margin: '0 auto 60px',
          }}
        >
          {pillars.map((item, idx) => (
            <div
              key={item.title}
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                border: '1.5px solid #E8D9C5',
                padding: '32px 28px',
                boxShadow: '0 8px 24px rgba(56, 31, 21, 0.05)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#FDF6EC',
                  border: '1.5px solid #E8D9C5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  color: '#BA724C',
                  fontSize: '16px',
                  marginBottom: '18px',
                }}
              >
                0{idx + 1}
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#381F15', margin: '0 0 6px 0' }}>
                {item.title}
              </h2>
              <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#BA724C', marginBottom: '14px' }}>
                {item.sub}
              </div>
              <p style={{ fontSize: '14px', color: '#7C6053', lineHeight: 1.6, margin: 0 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Experience CTA */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1.5px solid #E8D9C5',
            borderRadius: '24px',
            padding: '40px',
            textAlign: 'center',
            maxWidth: '860px',
            margin: '0 auto',
            boxShadow: '0 8px 24px rgba(56, 31, 21, 0.04)',
          }}
        >
          <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#381F15', margin: '0 0 8px 0' }}>
            Taste the Craft Difference
          </h3>
          <p style={{ fontSize: '14.5px', color: '#7C6053', maxWidth: '580px', margin: '0 auto 24px', lineHeight: 1.55 }}>
            Pick your box size, customize each slot with genuine ingredients, and get it delivered cold-locked to your doorstep.
          </p>
          <button
            type="button"
            className="btn-final-checkout"
            onClick={() => navigate('/orders')}
            style={{ maxWidth: '280px', margin: '0 auto' }}
          >
            Build Your Artisan Box &rarr;
          </button>
        </div>
      </main>
    </div>
  );
}
