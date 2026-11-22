import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "./router";
import { getDraftFilledCount } from "./orderDraft";
import "./LandingPage.css";

export const FLAVORS = [
  {
    id: "cookies",
    name: "Cookies & Cream",
    shortDesc: "Rich velvety cream with crunchy dark chocolate cookie crumbles.",
    bg: "#CC7452",
    glowOuter: "rgba(253, 238, 204, 0.40)",
    glowHotspot: "rgba(255, 248, 235, 0.45)",
    image: "/images/hero-spotlight-milkshake.png",
    alt: "Artisan Cookies and Cream Milkshake in tall ribbed glass with whipped cream",
  },
  {
    id: "strawberry",
    name: "Wild Strawberry",
    shortDesc: "Sun-ripened organic strawberries whipped into lush silky dairy bliss.",
    bg: "#BA2E44",
    glowOuter: "rgba(255, 216, 222, 0.40)",
    glowHotspot: "rgba(255, 240, 243, 0.45)",
    image: "/images/Strawberry.png",
    alt: "Wild Strawberry Milkshake topped with fresh berries and strawberry glaze",
  },
  {
    id: "mint",
    name: "Mint Chocolate Chip",
    shortDesc: "Crisp garden mint infused with single-origin dark chocolate chips.",
    bg: "#276E5B",
    glowOuter: "rgba(210, 244, 235, 0.40)",
    glowHotspot: "rgba(232, 250, 244, 0.45)",
    image: "/images/mint.png",
    alt: "Mint Chocolate Chip Milkshake garnished with fresh mint and cocoa nibs",
  },
];

export const SIGNATURE_FLAVOURS = [
  {
    id: "cookies",
    name: "Cookies & Kräm",
    subtitle: "Swedish cookies and kram",
    price: "$12.00",
    desc: "Dark cocoa biscuit crumbles folded in rich double cream",
    image: "/images/hero-spotlight-milkshake.png",
  },
  {
    id: "strawberry",
    name: "Wild Strawbar",
    subtitle: "Swedish Strawbar swirl ice cream",
    price: "$10.00",
    desc: "Sun-ripened organic strawberries & thick sweet dairy",
    image: "/images/Strawberry.png",
  },
  {
    id: "mint",
    name: "Mint Choklad",
    subtitle: "Swedish mint chokaldchip",
    price: "$14.00",
    desc: "Crisp garden mint infused with single-origin dark chocolate chips",
    image: "/images/mint.png",
  },
];

export const FAQ_ITEMS = [
  {
    id: "different",
    emoji: "🍨",
    question: "What makes your ice cream different?",
    answer:
      "We use real tropical fruits, fresh dairy, and zero artificial flavours. Every batch is handcrafted in small quantities to maintain quality.",
  },
  {
    id: "delivery",
    emoji: "🚚",
    question: "Do you offer home delivery?",
    answer:
      "Yes! We deliver ice-cold milkshakes straight to your doorstep within 30–45 minutes using specialized insulated thermal bags with cold guarantees.",
  },
  {
    id: "vegan",
    emoji: "🌱",
    question: "Is your ice cream vegan or dairy-free?",
    answer:
      "We offer dedicated plant-based creations! Crafted with velvety organic oat milk and rich coconut cream, paired with real fruits and dairy-free single-origin dark chocolate.",
  },
  {
    id: "bulk",
    emoji: "📦",
    question: "Can I order in bulk for events/parties?",
    answer:
      "Absolutely! We offer multi-pack bundles (Duo Pack, Family 4-pack, and Party Crate) with custom flavour picks. For large celebrations, get in touch for custom batch orders.",
  },
];

export default function LandingPage({
  onStartOrder = () => {},
  onOpenAuth = () => {},
  cartCount = 0,
  currentUser = null,
}) {
  const { navigate } = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("Home");
  const [liveCartCount, setLiveCartCount] = useState(() => getDraftFilledCount());

  useEffect(() => {
    const handleUpdate = () => setLiveCartCount(getDraftFilledCount());
    window.addEventListener("milky_draft_updated", handleUpdate);
    return () => window.removeEventListener("milky_draft_updated", handleUpdate);
  }, []);

  // animatingState: null | { direction: 'next' | 'prev', outgoingIdx: number, incomingIdx: number }
  const [animatingState, setAnimatingState] = useState(null);
  const [openFaqId, setOpenFaqId] = useState("different");

  const toggleFaq = (id) => {
    setOpenFaqId((prev) => (prev === id ? null : id));
  };

  const currentFlavor = FLAVORS[activeIndex];
  const nextIndex1 = (activeIndex + 1) % FLAVORS.length;
  const nextIndex2 = (activeIndex + 2) % FLAVORS.length;

  const goToNext = useCallback(() => {
    if (animatingState) return;
    const nextIdx = (activeIndex + 1) % FLAVORS.length;
    setAnimatingState({
      direction: "next",
      outgoingIdx: activeIndex,
      incomingIdx: nextIdx,
    });
    setActiveIndex(nextIdx);
  }, [activeIndex, animatingState]);

  const goToPrev = useCallback(() => {
    if (animatingState) return;
    const prevIdx = (activeIndex - 1 + FLAVORS.length) % FLAVORS.length;
    setAnimatingState({
      direction: "prev",
      outgoingIdx: activeIndex,
      incomingIdx: prevIdx,
    });
    setActiveIndex(prevIdx);
  }, [activeIndex, animatingState]);

  useEffect(() => {
    if (!animatingState) return;
    const timer = setTimeout(() => {
      setAnimatingState(null);
    }, 650);
    return () => clearTimeout(timer);
  }, [animatingState]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "ArrowLeft") goToPrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrev]);

  return (
    <div className="landing-page-root">
      {/* Dynamic Animated Background Wave Layer */}
      <div className="hero-wave-container" aria-hidden="true">
        <svg
          viewBox="0 0 1440 830"
          preserveAspectRatio="none"
          className="hero-wave-svg"
        >
          <path
            style={{
              fill: currentFlavor.bg,
              transition: "fill 0.65s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            d="M0,0L1440,0L1440,805C1340,810,1220,770,1100,765C960,760,880,835,720,830C560,825,480,740,350,735C220,730,120,775,0,775Z"
          />
        </svg>

        {/* Ambient Radial Spotlight Glow */}
        <div
          className="hero-ambient-spotlight"
          style={{
            background: `radial-gradient(circle at 64% 45%, ${currentFlavor.glowHotspot} 0%, ${currentFlavor.glowOuter} 36%, transparent 72%)`,
            transition: "background 0.65s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </div>

      {/* Main Content Viewport */}
      <div className="landing-content-wrapper">
        {/* Top Header / Navigation Bar */}
        <header className="landing-header">
          {/* Brand Logo */}
          <div
            className="landing-brand-logo"
            onClick={() => {
              if (activeIndex !== 0 && !animatingState) {
                setAnimatingState({
                  direction: "next",
                  outgoingIdx: activeIndex,
                  incomingIdx: 0,
                });
                setActiveIndex(0);
              }
            }}
            role="button"
            tabIndex={0}
            title="Milky — Artisan Milkshakes"
          >
            milky
          </div>

          {/* Centered Floating Pill Navigation */}
          <nav className="nav-pill-menu" aria-label="Main Navigation">
            {[
              { label: "Home", path: "/" },
              { label: "Orders", path: "/orders" },
              ...(currentUser ? [{ label: "My Orders", path: "/my-orders" }] : []),
              ...(currentUser?.role === 'MANAGER' || currentUser?.role === 'STAFF' ? [{ label: "Manager Portal", path: "/management" }] : []),
              { label: "Flavours", path: "/flavours" },
              { label: "Philosophy", path: "/philosophy" },
            ].map((tab) => {
              const isActive = tab.label === "Home";
              return (
                <button
                  key={tab.label}
                  className={`nav-pill-item ${isActive ? "active" : ""}`}
                  onClick={() => {
                    if (tab.label === "Home") {
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    } else {
                      navigate(tab.path);
                    }
                  }}
                  type="button"
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons */}
          <div className="nav-right-actions">
            <button
              className="btn-ghost-pill cart-btn"
              onClick={() => navigate("/orders")}
              type="button"
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
              >
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              <span>Cart ({liveCartCount})</span>
            </button>

            {currentUser ? (
              <button
                className="btn-ghost-pill profile-btn"
                onClick={onOpenAuth}
                type="button"
                title={currentUser.role && currentUser.role !== "PATRON" ? `${currentUser.first_name || "Account"} (${currentUser.role})` : (currentUser.first_name || "Account")}
              >
                <span>{currentUser.first_name || "Account"}</span>
              </button>
            ) : (
              <button
                className="btn-ghost-pill profile-btn"
                onClick={() => navigate("/auth")}
                type="button"
                title="Account / Sign In"
              >
                <span>Sign In</span>
              </button>
            )}
          </div>
        </header>

        {/* Hero Showcase Section */}
        <section className="hero-showcase-section">
          {/* Left Column: Headline, Copy, and CTAs */}
          <div className="hero-left-column">
            <h1 className="hero-main-title">
              Taste Joy in
              <br />
              Every Sip
            </h1>

            <p className="hero-description">
              Handcrafted artisan milkshakes spun with whole organic dairy,
              house-made ripples, and slow-churned sweetness.
            </p>

            <div className="hero-cta-buttons">
              <button
                className="btn-cta-primary"
                onClick={() => navigate("/orders")}
                type="button"
              >
                Order Now
              </button>

              <button
                className="btn-cta-secondary"
                onClick={() => navigate("/philosophy")}
                type="button"
              >
                Learn More
              </button>
            </div>
          </div>

          {/* Right Column: Milkshake Showcase & Animated Forward-Only Queue */}
          <div className="hero-carousel-stage">
            {animatingState ? (
              animatingState.direction === "next" ? (
                <>
                  {/* Outgoing shake falling towards bottom-left of screen */}
                  <div
                    className="spotlight-shake-wrapper falling-exit"
                    key={`exit-${animatingState.outgoingIdx}`}
                  >
                    <div className="spotlight-ground-shadow shadow-falling-exit" />
                    <img
                      src={FLAVORS[animatingState.outgoingIdx].image}
                      alt={FLAVORS[animatingState.outgoingIdx].alt}
                      className="spotlight-image"
                    />
                  </div>

                  {/* Incoming shake moving from queue 1 into spotlight center */}
                  <div
                    className="spotlight-shake-wrapper entering-from-queue"
                    key={`enter-${animatingState.incomingIdx}`}
                  >
                    <div className="spotlight-ground-shadow shadow-entering-spotlight" />
                    <img
                      src={FLAVORS[animatingState.incomingIdx].image}
                      alt={FLAVORS[animatingState.incomingIdx].alt}
                      className="spotlight-image"
                    />
                  </div>

                  {/* Queue 1 moving from pos 2 to pos 1 */}
                  <div
                    className="queue-shake-wrapper queue-pos-1 anim-queue2-to-1"
                    key={`q1-${(animatingState.incomingIdx + 1) % FLAVORS.length}`}
                  >
                    <div className="queue-ground-shadow shadow-1" />
                    <img
                      src={FLAVORS[(animatingState.incomingIdx + 1) % FLAVORS.length].image}
                      alt={FLAVORS[(animatingState.incomingIdx + 1) % FLAVORS.length].name}
                      className="queue-image"
                    />
                  </div>

                  {/* Queue 2 entering from right */}
                  <div
                    className="queue-shake-wrapper queue-pos-2 anim-enter-queue2"
                    key={`q2-${(animatingState.incomingIdx + 2) % FLAVORS.length}`}
                  >
                    <div className="queue-ground-shadow shadow-2" />
                    <img
                      src={FLAVORS[(animatingState.incomingIdx + 2) % FLAVORS.length].image}
                      alt={FLAVORS[(animatingState.incomingIdx + 2) % FLAVORS.length].name}
                      className="queue-image"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Reverse animation for prev navigation */}
                  <div
                    className="spotlight-shake-wrapper exiting-to-queue"
                    key={`exit-prev-${animatingState.outgoingIdx}`}
                  >
                    <div className="spotlight-ground-shadow shadow-exit-to-queue" />
                    <img
                      src={FLAVORS[animatingState.outgoingIdx].image}
                      alt={FLAVORS[animatingState.outgoingIdx].alt}
                      className="spotlight-image"
                    />
                  </div>

                  <div
                    className="spotlight-shake-wrapper rising-from-bottom"
                    key={`enter-prev-${animatingState.incomingIdx}`}
                  >
                    <div className="spotlight-ground-shadow shadow-rising-from-bottom" />
                    <img
                      src={FLAVORS[animatingState.incomingIdx].image}
                      alt={FLAVORS[animatingState.incomingIdx].alt}
                      className="spotlight-image"
                    />
                  </div>

                  <div
                    className="queue-shake-wrapper queue-pos-1 anim-queue1-to-2"
                    key={`q1-prev-${(animatingState.incomingIdx + 1) % FLAVORS.length}`}
                  >
                    <div className="queue-ground-shadow shadow-1" />
                    <img
                      src={FLAVORS[(animatingState.incomingIdx + 1) % FLAVORS.length].image}
                      alt={FLAVORS[(animatingState.incomingIdx + 1) % FLAVORS.length].name}
                      className="queue-image"
                    />
                  </div>

                  <div
                    className="queue-shake-wrapper queue-pos-2"
                    key={`q2-prev-${(animatingState.incomingIdx + 2) % FLAVORS.length}`}
                  >
                    <div className="queue-ground-shadow shadow-2" />
                    <img
                      src={FLAVORS[(animatingState.incomingIdx + 2) % FLAVORS.length].image}
                      alt={FLAVORS[(animatingState.incomingIdx + 2) % FLAVORS.length].name}
                      className="queue-image"
                    />
                  </div>
                </>
              )
            ) : (
              <>
                {/* Static Resting State: Spotlight Shake */}
                <div className="spotlight-shake-wrapper" key={`static-${activeIndex}`}>
                  <div className="spotlight-ground-shadow" />
                  <img
                    src={currentFlavor.image}
                    alt={currentFlavor.alt}
                    className="spotlight-image"
                  />
                </div>

                {/* Queue Shake 1 (Cascading to the right) */}
                <div
                  className="queue-shake-wrapper queue-pos-1"
                  onClick={goToNext}
                  role="button"
                  tabIndex={0}
                  title={`Switch to ${FLAVORS[nextIndex1].name}`}
                >
                  <div className="queue-ground-shadow shadow-1" />
                  <img
                    src={FLAVORS[nextIndex1].image}
                    alt={FLAVORS[nextIndex1].name}
                    className="queue-image"
                  />
                </div>

                {/* Queue Shake 2 (Further to the right) */}
                <div
                  className="queue-shake-wrapper queue-pos-2"
                  onClick={goToNext}
                  role="button"
                  tabIndex={0}
                  title={`Switch to ${FLAVORS[nextIndex2].name}`}
                >
                  <div className="queue-ground-shadow shadow-2" />
                  <img
                    src={FLAVORS[nextIndex2].image}
                    alt={FLAVORS[nextIndex2].name}
                    className="queue-image"
                  />
                </div>
              </>
            )}

            {/* Compact Glass Navigation Controls */}
            <div className="carousel-nav-controls" aria-label="Carousel Navigation">
              <button
                className="nav-arrow-btn"
                onClick={goToPrev}
                disabled={!!animatingState}
                type="button"
                aria-label="Previous milkshake flavor"
                title="Previous flavor"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              <button
                className="nav-arrow-btn"
                onClick={goToNext}
                disabled={!!animatingState}
                type="button"
                aria-label="Next milkshake flavor"
                title="Next flavor"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* Bottom 20% Cream Section with Elevated Social Proof Card */}
        <section className="hero-bottom-cream-section">
          <div className="review-social-card">
            {/* Overlapping 3-Avatar Cluster */}
            <div className="avatar-cluster" aria-hidden="true">
              <div className="avatar-circle avatar-1" title="Elena R.">
                <span className="avatar-initials">ER</span>
              </div>
              <div className="avatar-circle avatar-2" title="Marcus T.">
                <span className="avatar-initials">MT</span>
              </div>
              <div className="avatar-circle avatar-3" title="Sophie L.">
                <span className="avatar-initials">SL</span>
              </div>
            </div>

            {/* Stars & Numerical Score */}
            <div className="rating-cluster">
              <div className="stars-row" aria-label="5 out of 5 stars">
                ★★★★★
              </div>
              <div className="rating-score">4.9 / 5.0</div>
            </div>

            {/* Vertical Divider */}
            <div className="review-divider" aria-hidden="true" />

            {/* Trust Copy */}
            <div className="review-trust-copy">
              <div className="trust-headline">Loved by 2,800+ sippers</div>
              <div className="trust-subtext">Ice-cold delivery guaranteed</div>
            </div>
          </div>
        </section>
      </div>

      {/* Section 2: Brand Philosophy & Ingredients Showcase (Seen when scrolling down) */}
      <section className="brand-philosophy-section" id="how-it-works">
        {/* Floating Artisan Scoop Elements with Depth of Field */}
        <div className="floating-scoops-layer" aria-hidden="true">
          <img
            src="/images/cream-scoop.png"
            alt=""
            className="floating-scoop scoop-top-left"
          />
          <img
            src="/images/cream-scoop.png"
            alt=""
            className="floating-scoop scoop-mid-left"
          />
          <img
            src="/images/cream-scoop.png"
            alt=""
            className="floating-scoop scoop-bottom-left"
          />
          <img
            src="/images/cream-scoop.png"
            alt=""
            className="floating-scoop scoop-top-right"
          />
          <img
            src="/images/cream-scoop.png"
            alt=""
            className="floating-scoop scoop-mid-right"
          />
        </div>

        <div className="philosophy-container">
          <h2 className="philosophy-headline">
            We believe in capturing the pure joy of indulgence in every sip.
            Our milkshakes are hand-spun with the finest organic dairy,
            house-made ripples, and real ingredients.
          </h2>

          {/* Elegant Inline Quality Highlights */}
          <div className="philosophy-inline-highlights">
            <span className="highlight-item">
              <span className="highlight-sparkle">✦</span> Pasture-Raised Organic Dairy
            </span>
            <span className="highlight-sep">•</span>
            <span className="highlight-item">
              <span className="highlight-sparkle">✦</span> Real Sun-Ripened Fruits
            </span>
            <span className="highlight-sep">•</span>
            <span className="highlight-item">
              <span className="highlight-sparkle">✦</span> Chilled & Spun to Order
            </span>
          </div>

          <div className="philosophy-cta-action">
            <button
              className="btn-cta-primary philosophy-order-btn"
              onClick={onStartOrder}
              type="button"
            >
              Build Your Custom Pack
            </button>
          </div>
        </div>

        {/* Bottom Melting Chocolate Wave Transition into Flavours Section */}
        <div className="melting-chocolate-wave-wrap" aria-hidden="true">
          <svg
            viewBox="0 0 1440 180"
            preserveAspectRatio="none"
            className="melting-chocolate-wave-svg"
          >
            <path
              d="M0,70 C180,135 320,25 510,85 C710,145 880,30 1080,95 C1220,135 1330,60 1440,75 L1440,180 L0,180 Z"
              fill="#BA724C"
            />
          </svg>
        </div>
      </section>

      {/* Section 3: Flavours Showcase Carousel (Explore Our Delicious Taste) */}
      <section className="flavours-menu-section" id="flavours">
        {/* Playful looping background line */}
        <div className="flavours-bg-loop-wave" aria-hidden="true">
          <svg viewBox="0 0 1440 380" fill="none" preserveAspectRatio="none">
            <path
              d="M-40,240 C180,330 360,70 640,190 C920,310 1160,90 1480,240"
              stroke="rgba(145, 78, 44, 0.45)"
              strokeWidth="18"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="flavours-content-wrapper">
          {/* Header Row */}
          <div className="flavours-header-row">
            <h2 className="flavours-header-title">
              Explore Our<br />Delicious Taste
            </h2>
            <p className="flavours-header-desc">
              Every scoop is a celebration of sunshine. Crafted with love,
              real fruit, and ultra-creamy textures.
            </p>
          </div>

          {/* Pedestal Showcase Grid */}
          <div className="flavours-carousel-container">
            <div className="flavours-cards-track">
              {SIGNATURE_FLAVOURS.map((item) => (
                <div className="flavour-pedestal-card" key={item.id}>
                  {/* Floating product cup overflowing the top */}
                  <div className="card-product-overflow">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="card-flavour-image"
                    />
                  </div>

                  <div className="card-body-content">
                    <div className="card-price">{item.price}</div>
                    <div className="card-flavour-sub">{item.subtitle}</div>
                    <p className="card-flavour-desc">{item.desc}</p>
                    <button
                      className="btn-card-buy"
                      onClick={onStartOrder}
                      type="button"
                    >
                      BUY NOW
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Wave Transition into Cream FAQ Section */}
        <div className="flavours-bottom-wave-wrap" aria-hidden="true">
          <svg
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            className="flavours-bottom-wave-svg"
          >
            <path
              d="M0,45 C280,115 520,15 820,75 C1080,125 1280,25 1440,55 L1440,120 L0,120 Z"
              fill="#FDEECC"
            />
          </svg>
        </div>
      </section>

      {/* Section 4: FAQ Section with Grand Emerald Green Card */}
      <section className="landing-faq-section" id="faq">
        <div className="faq-outer-wrapper">
          <div className="faq-green-card">
            {/* Background organic flowing wave line */}
            <svg
              className="faq-card-bg-wave"
              viewBox="0 0 1000 450"
              fill="none"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M-40,410 C180,430 260,260 520,310 C780,360 880,190 1040,210"
                stroke="rgba(16, 56, 37, 0.40)"
                strokeWidth="24"
                strokeLinecap="round"
              />
            </svg>

            <div className="faq-card-grid">
              {/* Left Column: Title, Subtitle, and Social Icon Stack */}
              <div className="faq-left-col">
                <div className="faq-left-header">
                  <h2 className="faq-title">FAQ's</h2>
                  <p className="faq-subtitle">
                    We've answered the most common questions to make your
                    experience as smooth as our ice cream.
                  </p>
                </div>

                <div className="faq-social-row" aria-label="Social media channels">
                  <a
                    href="#instagram"
                    className="faq-social-pill"
                    aria-label="Milky Shakes on Instagram"
                    title="Instagram"
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
                    >
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                  </a>

                  <a
                    href="#twitter"
                    className="faq-social-pill"
                    aria-label="Milky Shakes on X"
                    title="X (Twitter)"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>

                  <a
                    href="#tiktok"
                    className="faq-social-pill"
                    aria-label="Milky Shakes on TikTok"
                    title="TikTok"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.46 6.29 6.29 0 0 0 1.87-4.45V8.58a8.27 8.27 0 0 0 4.9 1.58V6.69z" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Right Column: Interactive Accordion Pill List */}
              <div
                className="faq-right-col"
                role="region"
                aria-label="Frequently Asked Questions list"
              >
                {FAQ_ITEMS.map((item) => {
                  const isOpen = openFaqId === item.id;
                  return (
                    <div
                      className={`faq-accordion-item ${isOpen ? "is-open" : ""}`}
                      key={item.id}
                    >
                      <button
                        className="faq-pill-btn"
                        onClick={() => toggleFaq(item.id)}
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`faq-answer-${item.id}`}
                      >
                        <div className="faq-pill-left">
                          <span className="faq-pill-emoji" aria-hidden="true">
                            {item.emoji}
                          </span>
                          <span className="faq-pill-question">{item.question}</span>
                        </div>
                        <div
                          className={`faq-circle-arrow ${isOpen ? "is-down" : "is-right"}`}
                          aria-hidden="true"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            {isOpen ? (
                              <polyline points="6 9 12 15 18 9" />
                            ) : (
                              <polyline points="9 6 15 12 9 18" />
                            )}
                          </svg>
                        </div>
                      </button>

                      {isOpen && (
                        <div
                          className="faq-answer-card"
                          id={`faq-answer-${item.id}`}
                        >
                          <p>{item.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Melting Transition into Deep Cocoa Footer */}
        <div className="faq-bottom-wave-wrap" aria-hidden="true">
          <svg
            viewBox="0 0 1440 120"
            preserveAspectRatio="none"
            className="faq-bottom-wave-svg"
          >
            <path
              d="M0,45 C280,115 520,15 820,75 C1080,125 1280,25 1440,55 L1440,120 L0,120 Z"
              fill="#381F15"
            />
          </svg>
        </div>
      </section>

      {/* Footer Section in Rich Warm Cocoa */}
      <footer className="landing-footer" id="contact">
        <div className="footer-inner">
          <div className="footer-brand-col">
            <div className="footer-logo">milky</div>
            <p className="footer-tagline">
              Handcrafted artisan milkshakes spun with whole organic dairy and pure passion. Delivered ice-cold.
            </p>
          </div>

          <div className="footer-links-group">
            <div className="footer-col">
              <h4>Pack Sizes</h4>
              <button type="button" onClick={onStartOrder}>Single Sip (1 shake)</button>
              <button type="button" onClick={onStartOrder}>Duo Pack (2 shakes)</button>
              <button type="button" onClick={onStartOrder}>Family Bundle (4-pack)</button>
              <button type="button" onClick={onStartOrder}>Party Crate (6-pack)</button>
            </div>

            <div className="footer-col">
              <h4>Signature Flavours</h4>
              <span>Cookies & Cream</span>
              <span>Wild Strawberry</span>
              <span>Mint Chocolate Chip</span>
            </div>

            <div className="footer-col">
              <h4>Hours &amp; Contact</h4>
              <span>Mon – Sun: 10:00 – 22:00</span>
              <span>Store Pickup &amp; Express Delivery</span>
              <span>hello@milkyshakes.com</span>
              <button
                type="button"
                onClick={() => navigate("/management")}
                style={{
                  marginTop: "10px",
                  background: "rgba(255, 255, 255, 0.12)",
                  color: "#FDEECC",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  borderRadius: "9999px",
                  padding: "5px 12px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  width: "fit-content",
                  transition: "all 0.2s ease",
                }}
                title="Open Manager Operations Portal"
              >
                Manager Portal
              </button>
            </div>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <span>© {new Date().getFullYear()} Milky Shakes Drinks. All rights reserved.</span>
          <span>100% Artisan Handcrafted Goodness.</span>
        </div>
      </footer>
    </div>
  );
}
