import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';
import {
  calculateOrderTotals,
  formatCurrency,
  generateReceiptNumber,
  DEFAULT_DELIVERY_FEE,
  MIN_DRINKS_PER_ORDER,
  MAX_DRINKS_PER_ORDER,
} from '@milky-shakes/shared';
import { useRouter } from './router';
import { saveOrderDraft, loadOrderDraft, clearOrderDraft } from './orderDraft';
import AuthModal from './AuthModal';
import { MilkyReceiptPrinter, ReceiptPrinter } from './ReceiptPrinter';
import './OrderPlacement.css';

// Icons
function IconDice() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <circle cx="15.5" cy="15.5" r="1.5" />
      <circle cx="8.5" cy="15.5" r="1.5" />
      <circle cx="15.5" cy="8.5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconStore() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconTruck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconSnowflake() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
    </svg>
  );
}

function IconPrint() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function IconCup({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 2h10l-1.5 18a2 2 0 0 1-2 1.8h-3a2 2 0 0 1-2-1.8L7 2z" />
      <path d="M6 6h12" />
      <line x1="12" y1="2" x2="12" y2="1" />
    </svg>
  );
}

function IconDoubleCup({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h6.5l-1 14a1.5 1.5 0 0 1-1.5 1.4h-1.5A1.5 1.5 0 0 1 5 18L4 4z" />
      <path d="M13.5 4H20l-1 14a1.5 1.5 0 0 1-1.5 1.4H16a1.5 1.5 0 0 1-1.5-1.4L13.5 4z" />
    </svg>
  );
}

function IconBox4({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <line x1="12" y1="3" x2="12" y2="21" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  );
}

function IconBox6({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <line x1="9.5" y1="3" x2="9.5" y2="21" />
      <line x1="14.5" y1="3" x2="14.5" y2="21" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  );
}

const PACK_OPTIONS = [
  {
    size: 1,
    title: 'Single',
    subtitle: 'Solo artisan shake',
    slotsLabel: '1 Slot',
    icon: <IconCup />,
  },
  {
    size: 2,
    title: '2-Pack',
    subtitle: 'Duo pair for two',
    slotsLabel: '2 Slots',
    icon: <IconDoubleCup />,
  },
  {
    size: 4,
    title: '4-Pack',
    subtitle: 'Family favorites box',
    slotsLabel: '4 Slots',
    badge: '10% OFF',
    badgeType: 'badge-discount',
    icon: <IconBox4 />,
  },
  {
    size: 6,
    title: '6-Pack',
    subtitle: 'Party crate + cold bag',
    slotsLabel: '6 Slots',
    badge: '15% OFF',
    badgeType: 'badge-best-value',
    icon: <IconBox6 />,
  },
];

// Helper to check if string is a valid UUID
function isUuid(val) {
  return (
    typeof val === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
  );
}

// Helper to guarantee valid RFC email format
function normalizeUserEmail(rawEmail) {
  if (!rawEmail) return 'customer@milkyshakes.com';
  const trimmed = rawEmail.trim();
  if (trimmed.includes('@') && trimmed.includes('.')) {
    return trimmed.toLowerCase();
  }
  const sanitized = trimmed.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase() || 'customer';
  return `${sanitized}@milkyshakes.com`;
}

// Helper to extract display name
function getItemName(item) {
  return (
    item?.name ||
    item?.flavour_name ||
    item?.consistency_name ||
    item?.topping_name ||
    item?.tier_name ||
    item?.title ||
    item?.description ||
    item?.code ||
    'Artisan Option'
  );
}

// Helper to extract numeric price
function getItemPrice(item) {
  const val =
    item?.base_price ??
    item?.extra_price ??
    item?.price ??
    item?.cost ??
    item?.surcharge ??
    0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
}

// Map flavour name to visual styling & realistic hero image
function getFlavourVisual(name = '') {
  const lower = (name || '').toLowerCase();

  // Mint / Mint Chocolate Chip (check first so mint chocolate doesn't get caught by chocolate)
  if (lower.includes('mint') || lower.includes('choklad') || lower.includes('peppermint')) {
    return {
      liquid: '#C6EBDD',
      swirl: '#276E5B',
      border: '#276E5B',
      aura: 'rgba(160, 230, 205, 0.45)',
      image: '/images/mint.png',
      alt: 'Mint Chocolate Chip Artisan Milkshake',
    };
  }

  // Strawberry
  if (lower.includes('strawberry') || lower.includes('jordgubb') || lower.includes('strawbar') || lower.includes('berry')) {
    return {
      liquid: '#F5CCD3',
      swirl: '#BA2E44',
      border: '#BA2E44',
      aura: 'rgba(245, 180, 195, 0.45)',
      image: '/images/Strawberry.png',
      alt: 'Wild Strawberry Artisan Milkshake',
    };
  }

  // Banana
  if (lower.includes('banana')) {
    return {
      liquid: '#FFF1A8',
      swirl: '#D4A41B',
      border: '#D4A41B',
      aura: 'rgba(255, 232, 130, 0.50)',
      image: '/images/banana.png',
      alt: 'Fresh Banana Artisan Milkshake',
    };
  }

  // Bar One
  if (lower.includes('bar one') || lower.includes('bar_one') || lower.includes('bar-one') || lower.includes('barone')) {
    return {
      liquid: '#5E3821',
      swirl: '#381C0E',
      border: '#381C0E',
      aura: 'rgba(180, 110, 60, 0.45)',
      image: '/images/bar_one.png',
      alt: 'Bar One Artisan Milkshake',
    };
  }

  // Chocolate
  if (lower.includes('chocolate') || lower.includes('choc') || lower.includes('cocoa') || lower.includes('belgian')) {
    return {
      liquid: '#4B2810',
      swirl: '#2C1406',
      border: '#2C1406',
      aura: 'rgba(125, 75, 45, 0.45)',
      image: '/images/chocolate.png',
      alt: 'Belgian Chocolate Artisan Milkshake',
    };
  }

  // Coffee
  if (lower.includes('coffee') || lower.includes('espresso') || lower.includes('mocha') || lower.includes('latte') || lower.includes('cappuccino')) {
    return {
      liquid: '#A47D55',
      swirl: '#5C3E28',
      border: '#5C3E28',
      aura: 'rgba(180, 140, 100, 0.45)',
      image: '/images/Coffee.png',
      alt: 'Artisan Roast Coffee Milkshake',
    };
  }

  // Vanilla
  if (lower.includes('vanilla') || lower.includes('vanilj')) {
    return {
      liquid: '#FFF8EC',
      swirl: '#E4CB9E',
      border: '#C5A775',
      aura: 'rgba(255, 245, 220, 0.55)',
      image: '/images/vanilla.png',
      alt: 'Madagascan Vanilla Artisan Milkshake',
    };
  }

  // Cookies & Cream / Oreo
  if (lower.includes('cookie') || lower.includes('kram') || lower.includes('cream') || lower.includes('oreo')) {
    return {
      liquid: '#E6D3BE',
      swirl: '#5A3828',
      border: '#5A3828',
      aura: 'rgba(235, 200, 160, 0.45)',
      image: '/images/hero-spotlight-milkshake.png',
      alt: 'Cookies & Cream Artisan Milkshake',
    };
  }

  return {
    liquid: '#EAD7C2',
    swirl: '#BA724C',
    border: '#BA724C',
    aura: 'rgba(235, 200, 160, 0.45)',
    image: '/images/hero-spotlight-milkshake.png',
    alt: 'Artisan Crafted Milkshake',
  };
}

// Official Toppan Security collection branches across South Africa
export const TOPPAN_SECURITY_BRANCHES = [
  {
    id: '5bf910ce-6107-463e-907d-261a075ccc29',
    name: 'Toppan Security — Irene HQ (Centurion / Pretoria)',
    address: '1st Floor, Block B, Southdowns Office Park, Cnr John Vorster & Karee St, Irene, 0157',
    contact_number: '+27 12 676 0000',
    city: 'Pretoria / Centurion, Gauteng',
  },
  {
    id: 'e373e658-fa8c-4ee0-999a-05544aefa950',
    name: 'Toppan Security — Johannesburg (Sandton Hub)',
    address: '135 Rivonia Road, Sandton, Johannesburg, Gauteng, 2196',
    contact_number: '+27 11 784 1000',
    city: 'Johannesburg, Gauteng',
  },
  {
    id: 'eb5f2a95-9f3f-4176-88bf-1ae6b2718163',
    name: 'Toppan Security — Cape Town (Century City Hub)',
    address: 'The Boulevard Office Park, Century Boulevard, Century City, Cape Town, 7441',
    contact_number: '+27 21 552 2000',
    city: 'Cape Town, Western Cape',
  },
  {
    id: '6b4e4a54-5287-4a7d-916d-3a2573de9e66',
    name: 'Toppan Security — Durban (Umhlanga Ridge Hub)',
    address: '21 Richefond Circle, Ridgeside Office Park, Umhlanga, Durban, 4319',
    contact_number: '+27 31 566 3000',
    city: 'Durban, KwaZulu-Natal',
  },
  {
    id: '185f3f6a-d98a-4956-b0d1-0a15760501c8',
    name: 'Toppan Security — Gqeberha (Fairview Hub)',
    address: '120 Norvic Drive, Greenacres / Fairview, Gqeberha, 6070',
    contact_number: '+27 41 363 4000',
    city: 'Gqeberha, Eastern Cape',
  },
];

export default function OrderPlacement({ currentUser, onSignOut, onBackToLanding, onAuthSuccess }) {
  const { navigate } = useRouter();

  // Load existing draft if present
  const initialDraft = useMemo(() => loadOrderDraft(), []);

  // Database catalog state
  const [flavours, setFlavours] = useState([]);
  const [consistencies, setConsistencies] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [discountTiers, setDiscountTiers] = useState([]);
  const [vatRate, setVatRate] = useState(0.15);
  const [restaurants, setRestaurants] = useState(TOPPAN_SECURITY_BRANCHES);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [databaseError, setDatabaseError] = useState(null);

  // Box Builder state
  const [packSize, setPackSize] = useState(() => initialDraft?.packSize || 4); // 2 | 4 | 6
  const [drinks, setDrinks] = useState(() => {
    if (initialDraft?.drinks && Array.isArray(initialDraft.drinks) && initialDraft.drinks.length > 0) {
      return initialDraft.drinks;
    }
    return [
      { id: 1, flavourId: '', consistencyId: '', toppingId: '', cost: 0 },
      { id: 2, flavourId: '', consistencyId: '', toppingId: '', cost: 0 },
      { id: 3, flavourId: '', consistencyId: '', toppingId: '', cost: 0 },
      { id: 4, flavourId: '', consistencyId: '', toppingId: '', cost: 0 },
    ];
  });
  const [activeSlotIndex, setActiveSlotIndex] = useState(() => initialDraft?.activeSlotIndex || 0);

  // Stage toggle: 'builder' | 'review'
  const [currentStage, setCurrentStage] = useState(() => initialDraft?.currentStage || 'builder');

  // Fulfillment & Discount state
  const [fulfillmentMode, setFulfillmentMode] = useState(() => initialDraft?.fulfillmentMode || 'PICKUP'); // 'PICKUP' | 'DELIVERY'
  const [pickupRestaurantId, setPickupRestaurantId] = useState(
    () => initialDraft?.pickupRestaurantId || TOPPAN_SECURITY_BRANCHES[0].id
  );
  const [pickupTimeSlot, setPickupTimeSlot] = useState(() => initialDraft?.pickupTimeSlot || '30_MINS');
  const [customPickupTime, setCustomPickupTime] = useState(() => initialDraft?.customPickupTime || '');
  const [deliveryStreet, setDeliveryStreet] = useState(() => initialDraft?.deliveryStreet || '');
  const [deliveryPostalCode, setDeliveryPostalCode] = useState(() => initialDraft?.deliveryPostalCode || '');
  const [deliveryPhone, setDeliveryPhone] = useState(
    () => initialDraft?.deliveryPhone || currentUser?.mobile_number || ''
  );
  const [deliveryInstructions, setDeliveryInstructions] = useState(() => initialDraft?.deliveryInstructions || '');

  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(() => initialDraft?.appliedDiscount || null);
  const [discountStatus, setDiscountStatus] = useState(null);
  const [patronCompletedOrders, setPatronCompletedOrders] = useState(() => currentUser?.completed_orders_count || 0);

  // Fetch patron completed orders for loyalty discount
  useEffect(() => {
    if (currentUser?.id || currentUser?.email) {
      const email = currentUser.email || '';
      const userId = currentUser.id || '';
      fetch(`/api/patron/orders?email=${encodeURIComponent(email)}&userId=${encodeURIComponent(userId)}`, {
        headers: { 'x-user-email': email, 'x-user-id': userId },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.loyalty && typeof data.loyalty.completedOrdersCount === 'number') {
            setPatronCompletedOrders(data.loyalty.completedOrdersCount);
          }
        })
        .catch(() => {});
    }
  }, [currentUser]);

  // Auth prompt modal for unauthenticated checkout
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Payment & Order Submission state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CARD'); // 'CARD' | 'EFT'
  const [cardholderName, setCardholderName] = useState(() => {
    if (currentUser?.name) return currentUser.name;
    if (currentUser?.first_name) {
      return currentUser.last_name
        ? `${currentUser.first_name} ${currentUser.last_name}`.trim()
        : currentUser.first_name.trim();
    }
    return '';
  });

  useEffect(() => {
    if (currentUser && !cardholderName) {
      const name = currentUser.name || (currentUser.first_name
        ? `${currentUser.first_name}${currentUser.last_name ? ` ${currentUser.last_name}` : ''}`.trim()
        : '');
      if (name) setCardholderName(name);
    }
  }, [currentUser]);
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('123');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);

  // Store Operational State & Coherent Inventory Stock (Coherent with Manager Portal)
  const [storeMode, setStoreMode] = useState('OPEN');
  const [storeAnnouncement, setStoreAnnouncement] = useState('');
  const [inventoryStockMap, setInventoryStockMap] = useState({});
  const [showOrderTracker, setShowOrderTracker] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loadingTracker, setLoadingTracker] = useState(false);

  // Load database catalog
  useEffect(() => {
    async function loadCatalog() {
      setLoadingCatalog(true);
      setDatabaseError(null);
      try {
        const { data: fData, error: fErr } = await supabase.from('flavours').select('*');
        if (fErr) throw { table: 'flavours', ...fErr };
        if (!fData || fData.length === 0) throw { table: 'flavours', message: 'No flavour rows found.' };

        // Ensure Mint Chocolate Chip is included if not present in flavours rows
        const hasMint = fData.some((f) => (f.name || '').toLowerCase().includes('mint'));
        const catalogFlavours = hasMint
          ? fData
          : [
              ...fData,
              {
                id: '24650caa-8f1d-4f5c-86d8-93e9f158b668',
                name: 'Mint Chocolate Chip',
                base_price: 40,
                is_active: true,
              },
            ];
        setFlavours(catalogFlavours);

        const { data: cData, error: cErr } = await supabase.from('consistencies').select('*');
        if (cErr) throw { table: 'consistencies', ...cErr };
        if (!cData || cData.length === 0) throw { table: 'consistencies', message: 'No consistency rows found.' };
        setConsistencies(cData);

        const { data: tData, error: tErr } = await supabase.from('toppings').select('*');
        if (tErr) throw { table: 'toppings', ...tErr };
        if (!tData || tData.length === 0) throw { table: 'toppings', message: 'No topping rows found.' };
        setToppings(tData);

        const standardConsistency = cData.find((c) => getItemPrice(c) === 0) || cData[0];
        const defaultTopping = tData[0];

        setDrinks((prev) => {
          return prev.map((d) => {
            if (!d.flavourId) return d;
            const cId = d.consistencyId || standardConsistency?.id || '';
            const tId = d.toppingId || defaultTopping?.id || '';
            const f = catalogFlavours.find((x) => String(x.id) === String(d.flavourId));
            const c = cData.find((x) => String(x.id) === String(cId)) || standardConsistency;
            const t = tData.find((x) => String(x.id) === String(tId)) || defaultTopping;
            const cost = Math.round(((f ? getItemPrice(f) : 0) + (c ? getItemPrice(c) : 0) + (t ? getItemPrice(t) : 0)) * 100) / 100;
            return {
              ...d,
              consistencyId: cId,
              toppingId: tId,
              cost,
            };
          });
        });

        const { data: dTiers } = await supabase.from('discount_tiers').select('*');
        setDiscountTiers(dTiers || []);

        const { data: cConfig } = await supabase.from('system_config').select('*');
        if (cConfig) {
          const vatEntry = cConfig.find((c) => c.config_key === 'VAT_PERCENTAGE');
          if (vatEntry?.config_value) {
            const parsed = parseFloat(vatEntry.config_value);
            if (!isNaN(parsed) && parsed > 0) setVatRate(parsed / 100);
          }
        }

        const { data: restData } = await supabase.from('restaurants').select('*').eq('is_active', true);
        const toppanBranches = (restData || []).filter((r) =>
          (r.name || '').toLowerCase().includes('toppan')
        );
        const activeBranches = toppanBranches.length > 0 ? toppanBranches : TOPPAN_SECURITY_BRANCHES;
        setRestaurants(activeBranches);
        setPickupRestaurantId((prev) =>
          prev && activeBranches.some((b) => b.id === prev) ? prev : activeBranches[0]?.id
        );
      } catch (err) {
        console.error('Database load error:', err);
        setDatabaseError({
          table: err.table || 'Database',
          message: err.message || 'Could not load store catalog.',
        });
      } finally {
        setLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, []);

  // Coherent Store & Inventory Real-Time Sync (poll Supabase audit_logs & system_config)
  const syncStoreAndInventory = useCallback(async () => {
    try {
      const [{ data: auditData }, { data: configData }] = await Promise.all([
        supabase
          .from('audit_logs')
          .select('*')
          .in('action', ['INVENTORY_UPDATED', 'STORE_STATUS_CHANGED'])
          .order('created_at', { ascending: false }),
        supabase.from('system_config').select('*'),
      ]);

      if (auditData) {
        const stockMap = {};
        for (const log of auditData) {
          if (log.action === 'INVENTORY_UPDATED') {
            if (log.entity_id && !stockMap[log.entity_id]) {
              stockMap[log.entity_id] = log.new_value;
            }
            if (log.field_name && !stockMap[log.field_name]) {
              stockMap[log.field_name] = log.new_value;
            }
          }
        }
        setInventoryStockMap(stockMap);

        const modeLog = auditData.find(
          (l) => l.action === 'STORE_STATUS_CHANGED' && (l.entity_id === 'STORE_MODE' || l.field_name === 'mode')
        );
        const annLog = auditData.find(
          (l) => l.action === 'STORE_STATUS_CHANGED' && (l.entity_id === 'STORE_ANNOUNCEMENT' || l.field_name === 'announcement')
        );

        if (modeLog?.new_value) {
          setStoreMode(modeLog.new_value);
        } else if (configData) {
          const cfgMode = configData.find((c) => c.config_key === 'STORE_MODE');
          if (cfgMode?.config_value) setStoreMode(cfgMode.config_value);
        }

        if (annLog?.new_value) {
          setStoreAnnouncement(annLog.new_value);
        } else if (configData) {
          const cfgAnn = configData.find((c) => c.config_key === 'STORE_ANNOUNCEMENT');
          if (cfgAnn?.config_value) setStoreAnnouncement(cfgAnn.config_value);
        }
      }
    } catch (e) {
      console.warn('Store sync error:', e);
    }
  }, []);

  useEffect(() => {
    syncStoreAndInventory();
    const interval = setInterval(syncStoreAndInventory, 4000);

    const handleInv = (e) => {
      const { itemId, itemName, stockStatus } = e.detail || {};
      setInventoryStockMap((prev) => ({
        ...prev,
        ...(itemId ? { [itemId]: stockStatus } : {}),
        ...(itemName ? { [itemName]: stockStatus } : {}),
      }));
    };

    const handleMode = (e) => {
      if (e.detail?.mode) setStoreMode(e.detail.mode);
    };

    const handleAnn = (e) => {
      if (e.detail?.announcement !== undefined) setStoreAnnouncement(e.detail.announcement);
    };

    window.addEventListener('milky:inventory_update', handleInv);
    window.addEventListener('milky:store_mode_update', handleMode);
    window.addEventListener('milky:store_announcement_update', handleAnn);

    return () => {
      clearInterval(interval);
      window.removeEventListener('milky:inventory_update', handleInv);
      window.removeEventListener('milky:store_mode_update', handleMode);
      window.removeEventListener('milky:store_announcement_update', handleAnn);
    };
  }, [syncStoreAndInventory]);

  // Fetch Patron Orders with Live Status for Real-Time Tracker Modal
  const fetchRecentOrders = useCallback(async () => {
    setLoadingTracker(true);
    try {
      const { data: sbOrders } = await supabase
        .from('orders')
        .select('*, order_items(*), users(*)')
        .order('created_at', { ascending: false })
        .limit(15);

      const [{ data: sbPayments }, { data: sbAuditLogs }] = await Promise.all([
        supabase.from('payments').select('*'),
        supabase
          .from('audit_logs')
          .select('*')
          .eq('action', 'STATUS_CHANGED')
          .order('created_at', { ascending: false }),
      ]);

      if (sbOrders) {
        let sessionIds = [];
        try {
          sessionIds = JSON.parse(localStorage.getItem('milky_placed_orders') || '[]');
        } catch (e) {}

        const userEmail = currentUser?.email ? normalizeUserEmail(currentUser.email) : null;
        const filtered = sbOrders.filter((o) => {
          if (userEmail && o.users?.email && normalizeUserEmail(o.users.email) === userEmail) return true;
          if (currentUser?.id && o.patron_id === currentUser.id) return true;
          if (sessionIds.includes(o.id) || sessionIds.includes(o.order_number)) return true;
          return !currentUser;
        });

        const mapped = filtered.map((o) => {
          const payment = sbPayments?.find((p) => p.order_id === o.id);
          const latestAudit = sbAuditLogs?.find(
            (l) => l.entity_id === o.id || l.entity_id === o.order_number
          );

          let status = o.status || 'PENDING_PAYMENT';
          if (latestAudit?.new_value) {
            status = latestAudit.new_value.split(' ')[0];
          } else if (payment?.status === 'SUCCESS' && status === 'PENDING_PAYMENT') {
            status = 'PAID';
          }

          return {
            ...o,
            orderId: o.id,
            orderNumber: o.order_number,
            status,
            payment,
            totals: {
              total: Number(o.total_amount || 0),
              subtotal: Number(o.subtotal_amount || 0),
              vat: Number(o.vat_amount || 0),
              discountAmount: Number(o.discount_amount || 0),
              deliveryFee: Number(o.delivery_fee || 0),
            },
            items: (o.order_items || []).map((it) => ({
              number: it.drink_number,
              flavour: it.flavour_name_snapshot,
              consistency: it.consistency_name_snapshot,
              topping: it.topping_name_snapshot,
              cost: Number(it.item_total || 0),
            })),
          };
        });

        setRecentOrders(mapped);
      }
    } catch (e) {
      console.warn('Recent orders tracker error:', e);
    } finally {
      setLoadingTracker(false);
    }
  }, [currentUser]);

  // Auto-persist order draft whenever configuration changes
  useEffect(() => {
    if (!placedOrder) {
      saveOrderDraft({
        packSize,
        drinks,
        activeSlotIndex,
        currentStage,
        fulfillmentMode,
        pickupRestaurantId,
        pickupTimeSlot,
        customPickupTime,
        deliveryStreet,
        deliveryPostalCode,
        deliveryPhone,
        deliveryInstructions,
        appliedDiscount,
      });
    }
  }, [
    placedOrder,
    packSize,
    drinks,
    activeSlotIndex,
    currentStage,
    fulfillmentMode,
    pickupRestaurantId,
    pickupTimeSlot,
    customPickupTime,
    deliveryStreet,
    deliveryPostalCode,
    deliveryPhone,
    deliveryInstructions,
    appliedDiscount,
  ]);

  // Handle Pack Size Switch
  function handlePackSizeChange(size) {
    const targetSize = Math.max(MIN_DRINKS_PER_ORDER, Math.min(MAX_DRINKS_PER_ORDER, size));
    setPackSize(targetSize);
    setDrinks((prev) => {
      const updated = [];
      for (let i = 0; i < targetSize; i++) {
        if (prev[i]) {
          updated.push(prev[i]);
        } else {
          updated.push({
            id: i + 1,
            flavourId: '',
            consistencyId: '',
            toppingId: '',
            cost: 0,
          });
        }
      }
      return updated;
    });

    if (activeSlotIndex >= targetSize) {
      setActiveSlotIndex(0);
    }
  }

  // Calculate single drink cost
  function computeDrinkCost(fId, cId, tId) {
    if (!fId) return 0;
    let cost = 0;
    const f = flavours.find((x) => String(x.id) === String(fId));
    if (f) cost += getItemPrice(f);

    const standardConsistency = consistencies.find((c) => getItemPrice(c) === 0) || consistencies[0];
    const c = consistencies.find((x) => String(x.id) === String(cId)) || standardConsistency;
    if (c) cost += getItemPrice(c);

    const defaultTopping = toppings[0];
    const t = toppings.find((x) => String(x.id) === String(tId)) || defaultTopping;
    if (t) cost += getItemPrice(t);

    return Math.round(cost * 100) / 100;
  }

  // Active Drink Shortcut & Visual Resolution
  const activeDrink = drinks[activeSlotIndex] || drinks[0];
  const activeFlavour = flavours.find((f) => String(f.id) === String(activeDrink?.flavourId));
  const activeConsistency = consistencies.find((c) => String(c.id) === String(activeDrink?.consistencyId));
  const activeTopping = toppings.find((t) => String(t.id) === String(activeDrink?.toppingId));
  const activeVisual = getFlavourVisual(activeFlavour ? getItemName(activeFlavour) : 'Signature');
  const selectedRestaurant = restaurants.find((r) => r.id === pickupRestaurantId) || restaurants[0];

  // 3D Cursor Tilt Parallax State & Handlers
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 0, glareY: 0 });
  const [isHoveringGlass, setIsHoveringGlass] = useState(false);
  const chamberRef = useRef(null);

  const handleChamberMouseMove = (e) => {
    if (!chamberRef.current) return;
    const rect = chamberRef.current.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      rotateY: +(xPct * 18).toFixed(2),
      rotateX: +(-yPct * 18).toFixed(2),
      glareX: +(-xPct * 30).toFixed(2),
      glareY: +(-yPct * 30).toFixed(2),
    });
  };

  const handleChamberMouseEnter = () => setIsHoveringGlass(true);
  const handleChamberMouseLeave = () => {
    setIsHoveringGlass(false);
    setTilt({ rotateX: 0, rotateY: 0, glareX: 0, glareY: 0 });
  };

  function handleSelectTopping(toppingItem) {
    updateActiveDrink('toppingId', toppingItem.id);
  }

  // Update field on active drink
  function updateActiveDrink(field, value) {
    const standardConsistency = consistencies.find((c) => getItemPrice(c) === 0) || consistencies[0];
    const defaultTopping = toppings[0];
    setDrinks((prev) => {
      const copy = [...prev];
      const current = { ...copy[activeSlotIndex], [field]: value };
      if (field === 'flavourId' && value) {
        if (!current.consistencyId && standardConsistency) {
          current.consistencyId = standardConsistency.id;
        }
        if (!current.toppingId && defaultTopping) {
          current.toppingId = defaultTopping.id;
        }
      }
      current.cost = computeDrinkCost(
        current.flavourId,
        current.consistencyId,
        current.toppingId
      );
      copy[activeSlotIndex] = current;
      return copy;
    });
  }

  // Lock in slot & advance to next empty slot
  function handleLockCurrentSlot() {
    if (!activeDrink.flavourId) {
      if (flavours.length > 0) {
        updateActiveDrink('flavourId', flavours[0].id);
      }
    }
    // Find next empty slot
    const nextEmptyIndex = drinks.findIndex((d, idx) => idx > activeSlotIndex && !d.flavourId);
    if (nextEmptyIndex !== -1) {
      setActiveSlotIndex(nextEmptyIndex);
    } else {
      const anyEmpty = drinks.findIndex((d) => !d.flavourId);
      if (anyEmpty !== -1) {
        setActiveSlotIndex(anyEmpty);
      }
    }
  }

  // Barista's Choice: Intelligently fills empty slots
  function handleBaristaChoice() {
    if (flavours.length === 0 || consistencies.length === 0 || toppings.length === 0) return;

    setDrinks((prev) => {
      return prev.map((d, index) => {
        // If already configured, keep it; otherwise assign random artisan combo
        if (d.flavourId && d.consistencyId && d.toppingId) {
          return d;
        }
        const randomFlavour = flavours[index % flavours.length];
        const defaultConsistency = consistencies.find((c) => getItemPrice(c) === 0) || consistencies[0];
        const randomTopping = toppings[(index + 1) % toppings.length];
        const cost = computeDrinkCost(randomFlavour.id, defaultConsistency.id, randomTopping.id);
        return {
          id: d.id,
          flavourId: randomFlavour.id,
          consistencyId: defaultConsistency.id,
          toppingId: randomTopping.id,
          cost,
        };
      });
    });
  }

  // Clone Slot 1 into all empty slots
  function handleFillRemainingWithSlot1() {
    const slot1 = drinks[0];
    if (!slot1?.flavourId) return;

    setDrinks((prev) => {
      return prev.map((d, idx) => {
        if (idx === 0) return d;
        return {
          id: d.id,
          flavourId: slot1.flavourId,
          consistencyId: slot1.consistencyId || (consistencies[0] ? consistencies[0].id : ''),
          toppingId: slot1.toppingId || (toppings[0] ? toppings[0].id : ''),
          cost: slot1.cost,
        };
      });
    });
  }

  // Reset entire box
  function handleResetBox() {
    clearOrderDraft();
    setDrinks((prev) =>
      prev.map((d) => ({
        id: d.id,
        flavourId: '',
        consistencyId: '',
        toppingId: '',
        cost: 0,
      }))
    );
    setActiveSlotIndex(0);
  }

  // Handle successful auth from inline modal
  function handleAuthModalSuccess(user) {
    setShowAuthModal(false);
    if (onAuthSuccess) {
      onAuthSuccess(user);
    }
    setCurrentStage('review');
  }

  // Clear single slot
  function handleClearSlot(index, e) {
    if (e) e.stopPropagation();
    setDrinks((prev) => {
      const copy = [...prev];
      copy[index] = {
        id: copy[index].id,
        flavourId: '',
        consistencyId: '',
        toppingId: '',
        cost: 0,
      };
      return copy;
    });
    setActiveSlotIndex(index);
  }

  // Calculate volume discount tier or frequent customer discount
  const effectiveDiscount = useMemo(() => {
    if (appliedDiscount) return appliedDiscount;

    // Frequent customer loyalty tiers
    if (patronCompletedOrders >= 10) {
      return { discount_percent: 15, tier_name: `Frequent Customer VIP Tier (15% Off - ${patronCompletedOrders} completed orders)` };
    }
    if (patronCompletedOrders >= 5) {
      return { discount_percent: 10, tier_name: `Frequent Customer Tier 2 (10% Off - ${patronCompletedOrders} completed orders)` };
    }
    if (patronCompletedOrders >= 3) {
      return { discount_percent: 5, tier_name: `Frequent Customer Tier 1 (5% Off - ${patronCompletedOrders} completed orders)` };
    }

    // 2. Volume Pack discount
    const filledCount = drinks.filter((d) => d.flavourId).length;
    if (filledCount >= 6) {
      return { discount_percent: 15, tier_name: '6-Pack Volume Discount (15% Off)' };
    }
    if (filledCount >= 4) {
      return { discount_percent: 10, tier_name: '4-Pack Volume Discount (10% Off)' };
    }
    return null;
  }, [drinks, appliedDiscount, patronCompletedOrders]);

  // Apply manual discount code
  function handleApplyDiscountCode() {
    setDiscountStatus(null);
    const code = discountCodeInput.trim().toUpperCase();
    if (!code) {
      setAppliedDiscount(null);
      return;
    }

    if (code === 'MILKY10') {
      setAppliedDiscount({ discount_percent: 10, tier_name: 'Welcome Sipper Code (10% Off)' });
      setDiscountStatus({ type: 'success', text: '10% Welcome Discount applied!' });
      return;
    }

    const matchedTier = discountTiers.find(
      (tier) =>
        (tier.code && tier.code.toUpperCase() === code) ||
        (tier.name && tier.name.toUpperCase() === code)
    );

    if (matchedTier) {
      const pct = matchedTier.discount_percent ?? matchedTier.percent ?? 10;
      setAppliedDiscount({ ...matchedTier, discount_percent: pct });
      setDiscountStatus({ type: 'success', text: `Code applied: ${pct}% discount!` });
    } else {
      setAppliedDiscount(null);
      setDiscountStatus({ type: 'error', text: `Voucher code "${code}" is invalid or expired.` });
    }
  }

  // Live order totals calculation & configured items
  const deliveryFee = fulfillmentMode === 'DELIVERY' ? DEFAULT_DELIVERY_FEE : 0;
  const configuredDrinks = useMemo(
    () => drinks.filter((d) => Boolean(d && d.flavourId)),
    [drinks]
  );
  const filledDrinksCount = configuredDrinks.length;
  // Dynamic checkout: allows proceeding as long as at least 1 drink is selected (partial packs supported)
  const isOrderReady = filledDrinksCount >= MIN_DRINKS_PER_ORDER;

  const orderTotals = useMemo(() => {
    return calculateOrderTotals(configuredDrinks, effectiveDiscount, vatRate, deliveryFee);
  }, [configuredDrinks, effectiveDiscount, vatRate, deliveryFee]);

  // Helper to format/compute pickup time string
  const getComputedPickupTime = useCallback(() => {
    const now = new Date();
    if (pickupTimeSlot === 'ASAP') {
      return new Date(now.getTime() + 20 * 60 * 1000).toISOString();
    }
    if (pickupTimeSlot === '30_MINS') {
      return new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    }
    if (pickupTimeSlot === '45_MINS') {
      return new Date(now.getTime() + 45 * 60 * 1000).toISOString();
    }
    if (pickupTimeSlot === '60_MINS') {
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    }
    if (pickupTimeSlot === 'CUSTOM' && customPickupTime) {
      const [h, m] = customPickupTime.split(':');
      const customDate = new Date();
      customDate.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
      return customDate.toISOString();
    }
    return new Date(now.getTime() + 30 * 60 * 1000).toISOString();
  }, [pickupTimeSlot, customPickupTime]);

  // Validate fulfillment
  const isFulfillmentValid = useMemo(() => {
    if (fulfillmentMode === 'PICKUP') {
      return Boolean(pickupRestaurantId && (pickupTimeSlot !== 'CUSTOM' || customPickupTime));
    }
    if (fulfillmentMode === 'DELIVERY') {
      return Boolean(deliveryStreet.trim() && deliveryPostalCode.trim() && deliveryPhone.trim());
    }
    return false;
  }, [fulfillmentMode, pickupRestaurantId, pickupTimeSlot, customPickupTime, deliveryStreet, deliveryPostalCode, deliveryPhone]);

  // Handle Order Placement to Supabase
  async function handleProceedToPayment() {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    if (storeMode === 'PAUSED') {
      setSubmitError('The kitchen is temporarily paused while baristas craft active orders. Please check back shortly!');
      return;
    }
    if (!isOrderReady || !isFulfillmentValid) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      let patronUuid = isUuid(currentUser?.id) ? currentUser.id : null;
      const userEmail = normalizeUserEmail(currentUser?.email);

      if (!patronUuid) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', userEmail)
          .maybeSingle();

        if (existingUser?.id) {
          patronUuid = existingUser.id;
        } else {
          const { data: newUser, error: userErr } = await supabase
            .from('users')
            .insert([
              {
                email: userEmail,
                first_name: currentUser?.first_name || userEmail.split('@')[0],
                mobile_number: '+27000000000',
                password_hash: 'prototype_authenticated',
                role: 'PATRON',
                completed_orders_count: 0,
                is_active: true,
              },
            ])
            .select()
            .single();
          if (userErr) throw userErr;
          patronUuid = newUser.id;
        }
      }

      const uniqueOrderNumber = `MSD-${Date.now().toString().slice(-6)}`;
      const selectedRestaurant = restaurants.find((r) => r.id === pickupRestaurantId);
      const computedPickupTime = fulfillmentMode === 'PICKUP' ? getComputedPickupTime() : null;

      // Ensure valid restaurant ID (required NOT NULL by orders table)
      const validRestaurantId =
        (pickupRestaurantId && isUuid(pickupRestaurantId) ? pickupRestaurantId : null) ||
        (restaurants.length > 0 ? restaurants[0].id : TOPPAN_SECURITY_BRANCHES[0].id);

      // Ensure pickup_time is always a valid ISO timestamp (required NOT NULL by orders table)
      const validPickupTime = computedPickupTime || new Date(Date.now() + 30 * 60 * 1000).toISOString();

      const fulfillmentData = {
        mode: fulfillmentMode,
        restaurantId: validRestaurantId,
        restaurantName: selectedRestaurant?.name || TOPPAN_SECURITY_BRANCHES[0].name,
        restaurantAddress: selectedRestaurant?.address || TOPPAN_SECURITY_BRANCHES[0].address,
        pickupTimeSlot: fulfillmentMode === 'PICKUP' ? pickupTimeSlot : null,
        pickupTime: validPickupTime,
        streetAddress: fulfillmentMode === 'DELIVERY' ? deliveryStreet.trim() : null,
        postalCode: fulfillmentMode === 'DELIVERY' ? deliveryPostalCode.trim() : null,
        recipientPhone: fulfillmentMode === 'DELIVERY' ? deliveryPhone.trim() : null,
        deliveryInstructions: fulfillmentMode === 'DELIVERY' ? deliveryInstructions.trim() : null,
      };

      // Prepare line items first to ensure mathematical precision and satisfy chk_order_items_item_total:
      // CHECK (item_total = flavour_price_snapshot + consistency_price_snapshot + topping_price_snapshot)
      const defaultConsistency = consistencies.find((c) => getItemPrice(c) === 0) || consistencies[0];
      const defaultTopping = toppings[0];

      const lineItemsData = configuredDrinks.map((drink, idx) => {
        let resolvedFlavour = flavours.find((x) => String(x.id) === String(drink.flavourId));
        if (!resolvedFlavour && drink.flavourId) {
          const lower = String(drink.flavourId).toLowerCase();
          resolvedFlavour = flavours.find((x) => (x.name || '').toLowerCase().includes(lower));
        }
        if (!resolvedFlavour) resolvedFlavour = flavours[0];

        let resolvedConsistency =
          consistencies.find((x) => String(x.id) === String(drink.consistencyId)) || defaultConsistency;

        let resolvedTopping =
          toppings.find((x) => String(x.id) === String(drink.toppingId)) || defaultTopping;

        const fPrice = getItemPrice(resolvedFlavour);
        const cPrice = getItemPrice(resolvedConsistency);
        const tPrice = getItemPrice(resolvedTopping);
        // Explicitly sum snapshots so it satisfies PostgreSQL chk_order_items_item_total:
        const itemTotal = Math.round((fPrice + cPrice + tPrice) * 100) / 100;

        return {
          drink_number: idx + 1,
          flavour_id: resolvedFlavour?.id,
          flavour_name_snapshot: getItemName(resolvedFlavour) || 'Flavour',
          flavour_price_snapshot: fPrice,
          consistency_id: resolvedConsistency?.id,
          consistency_name_snapshot: getItemName(resolvedConsistency) || 'Standard',
          consistency_price_snapshot: cPrice,
          topping_id: resolvedTopping?.id,
          topping_name_snapshot: getItemName(resolvedTopping) || 'Topping',
          topping_price_snapshot: tPrice,
          item_total: itemTotal,
        };
      });

      // Calculate order totals using shared helper with lineItemsData
      const deliveryFeeAmount = fulfillmentMode === 'DELIVERY' ? deliveryFee : 0;
      const computedTotals = calculateOrderTotals(
        lineItemsData.map((it) => ({ cost: it.item_total })),
        effectiveDiscount,
        vatRate,
        deliveryFeeAmount
      );

      const orderPayload = {
        order_number: uniqueOrderNumber,
        patron_id: patronUuid,
        status: 'PENDING_PAYMENT',
        fulfillment_mode: fulfillmentMode,
        restaurant_id: validRestaurantId,
        pickup_time: validPickupTime,
        number_of_drinks: lineItemsData.length,
        items_count: lineItemsData.length,
        subtotal_amount: computedTotals.subtotal,
        subtotal: computedTotals.subtotal,
        discount_amount: computedTotals.discountAmount ?? 0,
        vat_rate: vatRate,
        vat_amount: computedTotals.vat,
        total_amount: computedTotals.total,
        delivery_fee: deliveryFeeAmount,
        delivery_address: fulfillmentMode === 'DELIVERY' ? deliveryStreet.trim() : null,
        delivery_postal_code: fulfillmentMode === 'DELIVERY' ? deliveryPostalCode.trim() : null,
        recipient_phone: fulfillmentMode === 'DELIVERY' ? deliveryPhone.trim() : null,
        delivery_instructions: fulfillmentMode === 'DELIVERY' ? (deliveryInstructions.trim() || null) : null,
      };

      const { data: insertedOrder, error: orderErr } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
        .single();

      if (orderErr) throw orderErr;

      const orderId = insertedOrder.id;

      // Insert line items matching exact schema of order_items
      const lineItems = lineItemsData.map((item) => ({
        ...item,
        order_id: orderId,
      }));

      const { error: itemsErr } = await supabase.from('order_items').insert(lineItems);
      if (itemsErr) throw itemsErr;

      const preparedOrder = {
        orderId,
        orderNumber: insertedOrder.order_number || uniqueOrderNumber,
        fulfillment: fulfillmentData,
        items: lineItemsData.map((it) => ({
          number: it.drink_number,
          flavour: it.flavour_name_snapshot,
          consistency: it.consistency_name_snapshot,
          topping: it.topping_name_snapshot,
          cost: it.item_total,
        })),
        totals: computedTotals,
        status: 'PENDING_PAYMENT',
      };

      setPendingOrderData(preparedOrder);
      setShowPaymentModal(true);
      setPaymentError('');
    } catch (err) {
      console.error('Order creation error:', err);
      setSubmitError(err.message || 'Could not save your order.');
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Payment Processing
  async function handleExecutePayment(simulatedOutcome = 'SUCCESS') {
    if (!pendingOrderData) return;
    setProcessingPayment(true);
    setPaymentError('');

    try {
      if (simulatedOutcome === 'FAILED') {
        throw new Error('Card declined: Insufficient funds or card security check failed. Your order is safely saved in PENDING PAYMENT status.');
      }

      const txnRef = `txn_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      const receiptNum = generateReceiptNumber(pendingOrderData.orderNumber);
      const settledTimestamp = new Date().toISOString();

      if (isUuid(pendingOrderData.orderId)) {
        await supabase.from('payments').insert([
          {
            order_id: pendingOrderData.orderId,
            transaction_reference: txnRef,
            payment_gateway: 'STRIPE',
            amount: pendingOrderData.totals.total,
            currency: 'ZAR',
            status: 'SUCCESS',
            receipt_number: receiptNum,
            receipt_emailed: false,
            gateway_response: {
              brand: 'Visa',
              last4: '4242',
              cardholder: cardholderName,
              paymentMethod,
            },
            settled_at: settledTimestamp,
          },
        ]);

        await supabase.from('orders').update({ status: 'PAID' }).eq('id', pendingOrderData.orderId);
      }

      const customerEmail = normalizeUserEmail(currentUser?.email);
      const customerName = (cardholderName || currentUser?.name || currentUser?.first_name || 'Valued Customer').trim();

      const confirmedOrder = {
        ...pendingOrderData,
        customerEmail,
        customerName,
        status: 'PAID',
        payment: {
          receiptNumber: receiptNum,
          transactionReference: txnRef,
          settledAt: settledTimestamp,
          paymentMethod: paymentMethod === 'CARD' ? `Visa ending in 4242 (${customerName})` : 'Instant EFT (Verified)',
          paymentStatus: 'PAID',
          receiptEmailed: false,
        },
      };

      setPlacedOrder(confirmedOrder);
      clearOrderDraft();

      // Remember order in local session for live tracker drawer
      try {
        const prev = JSON.parse(localStorage.getItem('milky_placed_orders') || '[]');
        if (!prev.includes(confirmedOrder.orderId)) {
          prev.unshift(confirmedOrder.orderId);
          localStorage.setItem('milky_placed_orders', JSON.stringify(prev.slice(0, 20)));
        }
      } catch (e) {}

      // Register live STATUS_CHANGED in Supabase audit_logs & broadcast
      try {
        await supabase.from('audit_logs').insert([
          {
            action: 'STATUS_CHANGED',
            actor_role: 'CUSTOMER',
            entity_type: 'orders',
            entity_id: pendingOrderData.orderId,
            field_name: 'status',
            new_value: 'PAID',
          },
        ]);
        window.dispatchEvent(
          new CustomEvent('milky:order_status_update', {
            detail: { orderId: pendingOrderData.orderId, newStatus: 'PAID' },
          })
        );
      } catch (e) {}

      setShowPaymentModal(false);
      setPendingOrderData(null);

      // Automated Receipt & Tax Invoice Email Dispatch
      if (customerEmail) {
        fetch('/api/orders/email-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerEmail,
            customerName,
            order: confirmedOrder,
            receipt: confirmedOrder.payment,
          }),
        })
          .then((res) => res.text())
          .then((text) => {
            let resData = {};
            try {
              resData = text ? JSON.parse(text) : {};
            } catch {
              console.warn('API returned non-JSON response:', text);
              return;
            }
            if (resData.success) {
              setPlacedOrder((prev) => (prev ? {
                ...prev,
                payment: { ...prev.payment, receiptEmailed: true },
              } : prev));

              if (isUuid(pendingOrderData.orderId)) {
                supabase
                  .from('payments')
                  .update({ receipt_emailed: true })
                  .eq('order_id', pendingOrderData.orderId)
                  .then(() => {})
                  .catch((err) => console.warn('Could not update receipt_emailed flag in database:', err));
              }
            }
          })
          .catch((emailErr) => console.warn('Order confirmation email trigger failed:', emailErr));
      }
    } catch (err) {
      console.error('Payment error:', err);
      setPaymentError(err.message || 'Payment processing failed. Please retry.');
    } finally {
      setProcessingPayment(false);
    }
  }

  // Database error display
  if (databaseError) {
    return (
      <div className="box-builder-canvas">
        <div className="review-stage-card" role="alert">
          <h2 className="box-page-title" style={{ color: '#B91C1C' }}>Menu Unavailable</h2>
          <p className="box-page-subtitle">We are having trouble loading the ingredients catalog right now.</p>
          <p style={{ marginTop: '12px', color: '#7C6053' }}>Please check your connection and reload to craft your order.</p>
          <button type="button" className="btn-final-checkout" onClick={() => window.location.reload()} style={{ marginTop: '20px', maxWidth: '240px' }}>
            Reload Menu
          </button>
        </div>
      </div>
    );
  }

  // Confirmed Receipt View
  if (placedOrder) {
    return (
      <div className="box-builder-canvas">
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
              ...(currentUser ? [{ label: 'My Orders', path: '/my-orders' }] : []),
              ...(currentUser?.role === 'MANAGER' || currentUser?.role === 'STAFF' ? [{ label: 'Manager Portal', path: '/management' }] : []),
              { label: 'Flavours', path: '/flavours' },
              { label: 'Philosophy', path: '/philosophy' },
            ].map((tab) => {
              const isActive = tab.label === 'Orders';
              return (
                <button
                  key={tab.label}
                  className={`box-nav-pill-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (tab.label === 'Orders') {
                      handleResetBox();
                      setPlacedOrder(null);
                      setCurrentStage('builder');
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
                onClick={() => navigate('/auth?returnUrl=/orders')}
                title="Sign In"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        <main style={{ padding: '24px 0 60px' }}>
          <MilkyReceiptPrinter
            order={placedOrder}
            onReset={() => {
              setPlacedOrder(null);
              setCurrentStage('builder');
              handleResetBox();
            }}
            onHome={() => navigate('/')}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="box-builder-canvas">
      {/* Top Header / Navigation Bar (Coherent with Landing Page) */}
      <header className="box-nav-header">
        {/* Brand Logo */}
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
            ...(currentUser ? [{ label: 'My Orders', path: '/my-orders' }] : []),
            ...(currentUser?.role === 'MANAGER' || currentUser?.role === 'STAFF' ? [{ label: 'Manager Portal', path: '/management' }] : []),
            { label: 'Flavours', path: '/flavours' },
            { label: 'Philosophy', path: '/philosophy' },
          ].map((tab) => {
            const isActive = tab.label === 'Orders';
            return (
              <button
                key={tab.label}
                className={`box-nav-pill-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (tab.label === 'Orders') {
                    setCurrentStage('builder');
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

        {/* Right Action Icons / Buttons */}
        <div className="box-nav-actions">
          <button
            type="button"
            className="box-btn-ghost-pill tracker-nav-btn"
            onClick={() => {
              setShowOrderTracker(true);
              fetchRecentOrders();
            }}
            title="Track Orders & Live Kitchen Status"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Track Orders</span>
          </button>

          <button
            type="button"
            className="box-btn-ghost-pill cart-btn"
            onClick={() => setCurrentStage(currentStage === 'builder' ? 'review' : 'builder')}
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
            <span>Cart ({filledDrinksCount})</span>
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
              onClick={() => navigate('/auth?returnUrl=/orders')}
              title="Sign In"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Studio Area */}
      <main className="box-main-content">
        {/* Real-time Store Operational Notices (Synchronized with Manager Portal) */}
        {storeMode === 'PAUSED' && (
          <div className="store-operational-banner banner-paused" role="alert">
            <span className="banner-icon-pill">PAUSED</span>
            <div className="banner-text-wrap">
              <strong>Kitchen Intake Temporarily Paused:</strong> Baristas are hand-churning high order volumes at capacity. Recipe builder is open, but checkout is temporarily held.
            </div>
          </div>
        )}

        {storeMode === 'BUSY' && (
          <div className="store-operational-banner banner-rush" role="status">
            <span className="banner-icon-pill">RUSH</span>
            <div className="banner-text-wrap">
              <strong>Kitchen Rush Active:</strong> Extended preparation buffer in effect (~15-20 min). Shakes are churned to order.
            </div>
          </div>
        )}

        {storeAnnouncement && (
          <div className="store-operational-banner banner-announcement" role="status">
            <span className="banner-icon-pill">NOTICE</span>
            <div className="banner-text-wrap">
              <strong>Milky Broadcast:</strong> {storeAnnouncement}
            </div>
          </div>
        )}

        {/* Header & Gamified Discount Meter */}
        <div className="box-header-row">
          <div className="box-title-pack-header">
            <div>
              <h1 className="box-page-title">
                {currentStage === 'builder'
                  ? packSize === 1
                    ? 'Build Your Single Milkshake'
                    : packSize === 2
                    ? 'Build Your 2-Pack Duo Box'
                    : packSize === 4
                    ? 'Build Your 4-Pack Family Box'
                    : 'Build Your 6-Pack Party Crate'
                  : 'Review Box & Fulfillment'}
              </h1>
              <p className="box-page-subtitle">
                {currentStage === 'builder'
                  ? 'Choose your pack size below, then customize each milkshake recipe in your carry tray.'
                  : 'All slots configured. Choose store collection or thermal courier delivery.'}
              </p>
            </div>
          </div>

          {/* Prominent Pack Size Selection Deck */}
          {currentStage === 'builder' && (
            <section className="pack-selection-deck" aria-label="Pack Size Selector">
              <div className="pack-selection-deck-header">
                <span className="pack-selection-step-tag">Step 1</span>
                <span className="pack-selection-deck-title">Choose Your Pack Size</span>
                <span className="pack-selection-deck-sub">
                  Select your bundle size — 4-pack and 6-pack unlock automatic savings &amp; cold bags!
                </span>
              </div>

              <div className="pack-cards-grid" role="radiogroup" aria-label="Pack Size Options">
                {PACK_OPTIONS.map((opt) => {
                  const isSelected = packSize === opt.size;
                  return (
                    <button
                      key={opt.size}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      className={`pack-card-btn ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => handlePackSizeChange(opt.size)}
                    >
                      <div className="pack-card-top-row">
                        <div className="pack-card-icon-frame">
                          {opt.icon}
                        </div>
                        <div className="pack-card-top-right">
                          {opt.badge && (
                            <span className={`pack-card-badge ${opt.badgeType || ''}`}>
                              {opt.badge}
                            </span>
                          )}
                          <div className="pack-card-radio-indicator" aria-hidden="true">
                            {isSelected ? <IconCheck /> : <span className="radio-dot" />}
                          </div>
                        </div>
                      </div>
                      <div className="pack-card-name">{opt.title}</div>
                      <div className="pack-card-desc">{opt.subtitle}</div>
                      <div className="pack-card-slots-pill">
                        {opt.slotsLabel}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Gamified Volume Discount Track */}
          <div className="box-discount-meter" aria-label="Pack Discount Progress">
            <div
              className="discount-meter-fill"
              style={{ width: `${Math.min(100, Math.round((filledDrinksCount / packSize) * 100))}%` }}
              aria-hidden="true"
            />
            <div className="discount-meter-content">
              <span className="meter-current-status">
                {filledDrinksCount} of {packSize} Slots Filled ({Math.round((filledDrinksCount / packSize) * 100)}%)
              </span>
              <span className={`meter-tier-step ${filledDrinksCount >= 4 ? 'is-unlocked' : 'is-target'}`}>
                {filledDrinksCount >= 4 ? '[Unlocked] 4-Pack: 10% Off' : '4-Pack: 10% Off Tier'}
              </span>
              <span className={`meter-tier-step ${filledDrinksCount >= 6 ? 'is-unlocked' : ''}`}>
                {filledDrinksCount >= 6 ? '[Unlocked] 6-Pack: 15% Off + Cold Bag' : '6-Pack: 15% Off + Cold Bag'}
              </span>
            </div>
          </div>
        </div>

        {/* STAGE 1: BOX BUILDER */}
        {currentStage === 'builder' && (
          <div className="box-builder-grid">
            {/* LEFT COLUMN: 3D PARALLAX SPOTLIGHT STAGE & TACTILE CARRY TRAY */}
            <section className="spotlight-stage-card" aria-label="3D Artisan Shake Studio">
              <div className="stage-top-meta">
                <span className="stage-pill-badge">
                  <IconCheck /> Slot {activeSlotIndex + 1} Spotlight
                </span>
                <span className="stage-tilt-hint">
                  Move cursor over shake for 3D perspective
                </span>
              </div>

              {/* 3D Cursor Tilt Parallax Chamber */}
              <div
                ref={chamberRef}
                className="parallax-stage-chamber"
                onMouseMove={handleChamberMouseMove}
                onMouseEnter={handleChamberMouseEnter}
                onMouseLeave={handleChamberMouseLeave}
                aria-label="3D Parallax Milkshake Preview"
              >
                {/* Dynamic Atmospheric Aura */}
                <div
                  className="spotlight-atmospheric-aura"
                  style={{ background: activeVisual.aura }}
                />

                {/* Soft Pedestal Shadow */}
                <div
                  className="spotlight-pedestal-shadow"
                  style={{
                    transform: `translateX(-50%) scale(${isHoveringGlass ? 1.08 : 1}) translate3d(${tilt.rotateY * 0.6}px, ${-tilt.rotateX * 0.4}px, 0)`,
                  }}
                />


                {/* 3D Tilting Glass Body */}
                <div
                  className="parallax-glass-wrapper"
                  style={{
                    transform: `perspective(1000px) rotateY(${tilt.rotateY}deg) rotateX(${tilt.rotateX}deg) scale3d(${
                      isHoveringGlass ? 1.04 : 1
                    }, ${isHoveringGlass ? 1.04 : 1}, 1)`,
                    transition: isHoveringGlass ? 'transform 0.08s ease-out' : 'transform 0.4s ease-out',
                  }}
                >
                  <img
                    src={activeVisual.image}
                    alt={activeVisual.alt}
                    className="realistic-hero-milkshake-img"
                  />
                  <div
                    className="glass-specular-glare"
                    style={{
                      transform: `translate3d(${tilt.glareX}px, ${tilt.glareY}px, 0)`,
                    }}
                  />
                </div>
              </div>

              {/* Live Active Slot Details Dock */}
              <div className="stage-details-dock">
                <div>
                  <h3 className="stage-details-title">
                    {activeFlavour ? getItemName(activeFlavour) : 'Select a Flavour'}
                  </h3>
                  <p className="stage-details-meta">
                    {activeConsistency ? getItemName(activeConsistency) : 'Consistency'} &bull;{' '}
                    {activeTopping ? getItemName(activeTopping) : 'Topping'}
                  </p>
                </div>
                <div className="stage-details-price">
                  {formatCurrency(activeDrink.cost || (activeFlavour ? getItemPrice(activeFlavour) : 0))}
                </div>
              </div>

              {/* Tactile Carry Tray Inset */}
              <div className="stage-tray-section">
                <div className="tray-section-header">
                  <h3 className="tray-section-title">
                    Artisan Kraft Carry Tray ({packSize} {packSize === 1 ? 'Slot' : 'Slots'})
                  </h3>
                  <button
                    type="button"
                    className="btn-barista-choice"
                    onClick={handleBaristaChoice}
                    title="Randomize recipes for empty slots"
                  >
                    <IconDice /> Barista's Choice
                  </button>
                </div>

                <div
                  className="tray-slots-strip"
                  style={{
                    gridTemplateColumns: `repeat(${packSize}, 1fr)`,
                  }}
                >
                  {drinks.map((drink, index) => {
                    const isFilled = Boolean(drink.flavourId);
                    const isActive = activeSlotIndex === index;
                    const f = flavours.find((item) => String(item.id) === String(drink.flavourId));
                    const slotVisual = getFlavourVisual(f ? getItemName(f) : '');

                    return (
                      <div
                        key={drink.id || index}
                        className={`tray-slot-mini-card ${isActive ? 'is-active-slot' : ''} ${
                          isFilled ? 'is-filled-slot' : 'is-empty-slot'
                        }`}
                        onClick={() => setActiveSlotIndex(index)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setActiveSlotIndex(index);
                          }
                        }}
                      >
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="mini-slot-num">SLOT {index + 1}</span>
                          {isFilled && (
                            <button
                              type="button"
                              className="slot-delete-btn"
                              onClick={(e) => handleClearSlot(index, e)}
                              title={`Clear Slot ${index + 1}`}
                              style={{ padding: 2, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--box-text-muted)' }}
                            >
                              <IconTrash />
                            </button>
                          )}
                        </div>

                        <div className="mini-slot-photo-frame">
                          {isFilled ? (
                            <img
                              src={slotVisual.image}
                              alt={slotVisual.alt}
                              className="mini-slot-photo"
                            />
                          ) : (
                            <div className="mini-empty-target">+</div>
                          )}
                        </div>

                        <div className="mini-slot-title">
                          {isFilled && f ? getItemName(f) : 'Configure'}
                        </div>
                        <div className="mini-slot-price">
                          {isFilled ? formatCurrency(drink.cost) : '---'}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="tray-utility-row">
                  <button
                    type="button"
                    className="btn-tray-utility"
                    onClick={handleFillRemainingWithSlot1}
                    disabled={!drinks[0]?.flavourId || packSize === 1}
                  >
                    <IconCopy /> Fill Remaining with Slot 1
                  </button>
                  <button
                    type="button"
                    className="btn-tray-utility"
                    onClick={handleResetBox}
                    disabled={filledDrinksCount === 0}
                  >
                    <IconTrash /> Reset Box
                  </button>
                </div>
              </div>
            </section>

            {/* RIGHT COLUMN: Slot Recipe Customizer Deck */}
            <section className="box-deck-card" aria-label="Recipe Customizer Deck">
              <div className="deck-header-badge">
                Slot {activeSlotIndex + 1} of {packSize}
              </div>
              <h2 className="deck-title">Customize Milkshake Recipe</h2>

              {/* Step 1: Base Flavour */}
              <div className="deck-step-section">
                <span className="deck-step-label">1. Choose Base Flavour</span>
                <div className="deck-flavour-grid">
                  {flavours.map((item) => {
                    const isSelected = String(activeDrink.flavourId) === String(item.id);
                    const visual = getFlavourVisual(getItemName(item));
                    const isOutOfStock =
                      inventoryStockMap[item.id] === 'OUT_OF_STOCK' ||
                      inventoryStockMap[getItemName(item)] === 'OUT_OF_STOCK' ||
                      item.is_active === false;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={isOutOfStock}
                        className={`btn-choice-card ${isSelected ? 'is-selected' : ''} ${isOutOfStock ? 'is-sold-out' : ''}`}
                        onClick={() => !isOutOfStock && updateActiveDrink('flavourId', item.id)}
                        title={isOutOfStock ? `${getItemName(item)} is currently sold out` : ''}
                      >
                        <div className="choice-card-thumb-wrap">
                          <img src={visual.image} alt={visual.alt} className="choice-card-thumb" />
                        </div>
                        <div className="choice-card-content">
                          <span className="choice-card-title">{getItemName(item)}</span>
                          <span className="choice-card-meta">{formatCurrency(getItemPrice(item))}</span>
                          {isOutOfStock && <span className="sold-out-badge">Sold Out</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Consistency */}
              <div className="deck-step-section">
                <span className="deck-step-label">2. Select Consistency</span>
                <div className="deck-consistency-row">
                  {consistencies.map((item) => {
                    const isSelected = String(activeDrink.consistencyId) === String(item.id);
                    const extraPrice = getItemPrice(item);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`btn-choice-card ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => updateActiveDrink('consistencyId', item.id)}
                      >
                        <span className="choice-card-title">{getItemName(item)}</span>
                        <span className="choice-card-meta">
                          {extraPrice > 0 ? `+${formatCurrency(extraPrice)}` : 'Standard'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Toppings (The Interactive Droppers) */}
              <div className="deck-step-section">
                <span className="deck-step-label">3. Crown with Topping </span>
                <div className="deck-toppings-wrap">
                  {toppings.map((item) => {
                    const isSelected = String(activeDrink.toppingId) === String(item.id);
                    const extraPrice = getItemPrice(item);
                    const isOutOfStock =
                      inventoryStockMap[item.id] === 'OUT_OF_STOCK' ||
                      inventoryStockMap[getItemName(item)] === 'OUT_OF_STOCK' ||
                      item.is_active === false;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={isOutOfStock}
                        className={`btn-topping-dropper ${isSelected ? 'is-selected' : ''} ${isOutOfStock ? 'is-sold-out' : ''}`}
                        onClick={() => !isOutOfStock && handleSelectTopping(item)}
                        title={isOutOfStock ? `${getItemName(item)} is currently sold out` : ''}
                      >
                        {isSelected && <IconCheck />}
                        <span>{getItemName(item)}</span>
                        {extraPrice > 0 && <span style={{ opacity: 0.8 }}>+{formatCurrency(extraPrice)}</span>}
                        {isOutOfStock && <span className="sold-out-badge">Sold Out</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lock Button */}
              <button
                type="button"
                className="btn-lock-slot"
                onClick={handleLockCurrentSlot}
              >
                Save Recipe into Slot {activeSlotIndex + 1} &rarr;
              </button>

              {/* Bottom Summary Dock */}
              <div className="deck-summary-dock">
                <div className="deck-summary-header">Current Box Estimate</div>
                <div className="deck-summary-price">{formatCurrency(orderTotals.total)}</div>
                <p className="deck-summary-note">
                  {filledDrinksCount === 0
                    ? 'Select at least 1 milkshake to proceed.'
                    : filledDrinksCount < packSize
                    ? `${filledDrinksCount} of ${packSize} slots filled. You can checkout now or fill ${packSize - filledDrinksCount} more!`
                    : effectiveDiscount
                    ? `${effectiveDiscount.tier_name} automatically applied!`
                    : 'All slots locked! Ready for fulfillment.'}
                </p>
                <button
                  type="button"
                  className="btn-proceed-review"
                  onClick={() => {
                    if (!currentUser) {
                      setShowAuthModal(true);
                    } else {
                      setCurrentStage('review');
                    }
                  }}
                  disabled={filledDrinksCount < MIN_DRINKS_PER_ORDER}
                >
                  Review Box & Fulfillment ({filledDrinksCount} {filledDrinksCount === 1 ? 'Shake' : 'Shakes'}) &rarr;
                </button>
              </div>
            </section>
          </div>
        )}

        {/* STAGE 2: REVIEW & FULFILLMENT */}
        {currentStage === 'review' && (
          <div className="box-builder-grid">
            {/* Left Column: Completed Pack Summary */}
            <section className="review-stage-card" aria-label="Packed Crate Summary">
              <div className="review-stage-header">
                <div>
                  <div className="deck-header-badge">
                    <IconCheck /> Pack Ready
                  </div>
                  <h2 className="box-page-title" style={{ fontSize: '24px', margin: 0 }}>
                    Artisan Crate ({configuredDrinks.length} {configuredDrinks.length === 1 ? 'Shake' : 'Shakes'})
                  </h2>
                </div>
                <button
                  type="button"
                  className="btn-back-to-tray"
                  onClick={() => setCurrentStage('builder')}
                >
                  &larr; Edit Box Slots
                </button>
              </div>

              {/* Items List (only configured drinks) */}
              <div className="packed-items-stack">
                {configuredDrinks.map((item, idx) => {
                  const f = flavours.find((x) => String(x.id) === String(item.flavourId));
                  const c = consistencies.find((x) => String(x.id) === String(item.consistencyId));
                  const t = toppings.find((x) => String(x.id) === String(item.toppingId));
                  const visual = getFlavourVisual(f ? getItemName(f) : '');
                  return (
                    <div key={item.id || idx} className="packed-item-row">
                      <div className="packed-item-left">
                        <span className="packed-item-number">SLOT {idx + 1}</span>
                        <img
                          src={visual.image}
                          alt={visual.alt}
                          style={{ width: '38px', height: '48px', objectFit: 'contain' }}
                        />
                        <div>
                          <div className="packed-item-title">{f ? getItemName(f) : 'Custom Shake'}</div>
                          <div className="packed-item-sub">
                            {c ? getItemName(c) : 'Smooth'} | Topping: {t ? getItemName(t) : 'None'}
                          </div>
                        </div>
                      </div>
                      <span className="packed-item-price">{formatCurrency(item.cost)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Thermal Packaging Assurance */}
              <div style={{ background: '#E8F8F0', border: '1px solid #BBE8D0', borderRadius: '18px', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#175234', fontWeight: '800', fontSize: '13.5px', marginBottom: '6px' }}>
                  <IconSnowflake /> 60-Minute Sub-Zero Cold-Lock Guarantee
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#2D7D54', lineHeight: 1.45 }}>
                  Every box is sealed with reusable food-safe dry-chill thermal inserts, keeping your milkshakes frozen, thick, and frosty.
                </p>
              </div>
            </section>

            {/* Right Column: Fulfillment & Checkout Form */}
            <section className="review-stage-card" aria-label="Fulfillment and Checkout Details">
              <span className="deck-step-label">Fulfillment Channel</span>
              <div className="fulfillment-channels-row" role="radiogroup">
                <button
                  type="button"
                  className={`channel-card ${fulfillmentMode === 'PICKUP' ? 'is-selected' : ''}`}
                  onClick={() => setFulfillmentMode('PICKUP')}
                >
                  <span className="channel-card-title">
                    <IconStore /> Store Pickup
                  </span>
                  <span className="channel-card-sub">Counter Collection (Free)</span>
                </button>

                <button
                  type="button"
                  className={`channel-card ${fulfillmentMode === 'DELIVERY' ? 'is-selected' : ''}`}
                  onClick={() => setFulfillmentMode('DELIVERY')}
                >
                  <span className="channel-card-title">
                    <IconTruck /> Courier Delivery
                  </span>
                  <span className="channel-card-sub">Thermal Sealed (+R15.00)</span>
                </button>
              </div>

              {/* Pickup Location & Time Selector */}
              {fulfillmentMode === 'PICKUP' && (
                <div className="fulfillment-field-box">
                  <label htmlFor="store-select" className="fulfillment-field-label">
                    Collection Store Location
                  </label>
                  <select
                    id="store-select"
                    className="fulfillment-select"
                    value={pickupRestaurantId}
                    onChange={(e) => setPickupRestaurantId(e.target.value)}
                  >
                    {restaurants.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>

                  {selectedRestaurant && (
                    <div style={{ marginTop: '10px', padding: '12px 14px', background: '#FAF4EC', border: '1px solid #E8D9C5', borderRadius: '12px', fontSize: '12.5px', color: '#7C6053' }}>
                      <div style={{ fontWeight: 700, color: '#381F15', marginBottom: '3px' }}>
                        {selectedRestaurant.name}
                      </div>
                      <div style={{ fontSize: '12px', lineHeight: 1.45 }}>
                        {selectedRestaurant.address}
                      </div>
                      {selectedRestaurant.contact_number && (
                        <div style={{ fontSize: '11.5px', marginTop: '5px', color: '#BA724C', fontWeight: 600 }}>
                          Branch Direct: {selectedRestaurant.contact_number}
                        </div>
                      )}
                    </div>
                  )}

                  <label htmlFor="pickup-time-select" className="fulfillment-field-label" style={{ marginTop: '14px' }}>
                    Estimated Collection Time
                  </label>
                  <select
                    id="pickup-time-select"
                    className="fulfillment-select"
                    value={pickupTimeSlot}
                    onChange={(e) => setPickupTimeSlot(e.target.value)}
                  >
                    <option value="ASAP">Ready in 15–20 minutes (ASAP)</option>
                    <option value="30_MINS">In 30 minutes</option>
                    <option value="45_MINS">In 45 minutes</option>
                    <option value="60_MINS">In 1 hour</option>
                    <option value="CUSTOM">Specific pickup time...</option>
                  </select>

                  {pickupTimeSlot === 'CUSTOM' && (
                    <div style={{ marginTop: '10px' }}>
                      <label htmlFor="custom-pickup-time" className="fulfillment-field-label">
                        Enter Preferred Collection Time
                      </label>
                      <input
                        id="custom-pickup-time"
                        type="time"
                        className="fulfillment-text-input"
                        value={customPickupTime}
                        onChange={(e) => setCustomPickupTime(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Delivery Address Fields */}
              {fulfillmentMode === 'DELIVERY' && (
                <div className="fulfillment-field-box">
                  <label htmlFor="delivery-street" className="fulfillment-field-label">
                    Street Address
                  </label>
                  <input
                    id="delivery-street"
                    type="text"
                    className="fulfillment-text-input"
                    value={deliveryStreet}
                    onChange={(e) => setDeliveryStreet(e.target.value)}
                    placeholder="e.g. 144 Oxford Road, Rosebank"
                    required
                  />

                  <label htmlFor="delivery-postal" className="fulfillment-field-label" style={{ marginTop: '8px' }}>
                    Postal Code
                  </label>
                  <input
                    id="delivery-postal"
                    type="text"
                    className="fulfillment-text-input"
                    value={deliveryPostalCode}
                    onChange={(e) => setDeliveryPostalCode(e.target.value)}
                    placeholder="e.g. 2196"
                    required
                  />

                  <label htmlFor="delivery-phone" className="fulfillment-field-label" style={{ marginTop: '8px' }}>
                    Recipient Mobile Phone
                  </label>
                  <input
                    id="delivery-phone"
                    type="tel"
                    className="fulfillment-text-input"
                    value={deliveryPhone}
                    onChange={(e) => setDeliveryPhone(e.target.value)}
                    placeholder="+27 82 555 1234"
                    required
                  />
                </div>
              )}

              {/* Promo Code Drawer */}
              <div className="promo-code-row">
                <input
                  type="text"
                  className="promo-input"
                  placeholder="Promo Code (e.g. MILKY10)"
                  value={discountCodeInput}
                  onChange={(e) => setDiscountCodeInput(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-apply-promo"
                  onClick={handleApplyDiscountCode}
                >
                  Apply
                </button>
              </div>

              {discountStatus && (
                <p style={{ fontSize: '12px', fontWeight: '700', color: discountStatus.type === 'success' ? '#2D7D54' : '#B91C1C', margin: '-10px 0 14px' }}>
                  {discountStatus.text}
                </p>
              )}

              {/* Receipt Breakdown Table */}
              <div className="receipt-table-card">
                <div className="receipt-row">
                  <span>Subtotal ({configuredDrinks.length} {configuredDrinks.length === 1 ? 'Milkshake' : 'Milkshakes'})</span>
                  <span>{formatCurrency(orderTotals.subtotal)}</span>
                </div>
                <div className={`receipt-row ${orderTotals.discountAmount > 0 ? 'is-discount' : ''}`}>
                  <span>Frequent Customer Discount</span>
                  <span>{orderTotals.discountAmount > 0 ? `-${formatCurrency(orderTotals.discountAmount)}` : formatCurrency(0)}</span>
                </div>
                {orderTotals.discountAmount > 0 && effectiveDiscount?.tier_name && (
                  <div style={{ fontSize: '11px', color: '#047857', padding: '0 0 6px 0', fontWeight: '600' }}>
                    Applied: {effectiveDiscount.tier_name}
                  </div>
                )}
                <div className="receipt-row">
                  <span>VAT (15% Included in Subtotal)</span>
                  <span>{formatCurrency(orderTotals.vat)}</span>
                </div>
                <div className="receipt-row">
                  <span>Fulfillment ({fulfillmentMode === 'PICKUP' ? 'Store Pickup' : 'Courier Delivery'})</span>
                  <span>{orderTotals.deliveryFee > 0 ? formatCurrency(orderTotals.deliveryFee) : 'FREE'}</span>
                </div>
                <div className="receipt-divider" />
                <div className="receipt-total-row">
                  <span>Total Amount Due</span>
                  <span className="receipt-total-val">{formatCurrency(orderTotals.total)}</span>
                </div>
              </div>

              {submitError && (
                <div style={{ color: '#B91C1C', background: '#FEF2F2', padding: '10px 14px', borderRadius: '12px', marginBottom: '14px', fontSize: '13px' }}>
                  {submitError}
                </div>
              )}

              {/* Primary Checkout CTA */}
              <button
                type="button"
                className="btn-final-checkout"
                onClick={handleProceedToPayment}
                disabled={submitting || !isOrderReady || !isFulfillmentValid || storeMode === 'PAUSED'}
              >
                {storeMode === 'PAUSED'
                  ? 'Kitchen Intake Temporarily Paused'
                  : submitting
                  ? 'Preparing Checkout...'
                  : `Proceed to Secure Payment (${formatCurrency(orderTotals.total)}) \u2192`}
              </button>

              <div className="checkout-security-footnote">
                <IconLock /> Safe 256-Bit SSL Encrypted Checkout
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Payment Processing Modal */}
      {showPaymentModal && pendingOrderData && (
        <div className="payment-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="pay-modal-title">
          <div className="payment-modal-card">
            <h2 id="pay-modal-title" className="payment-modal-title">Complete Payment</h2>
            <p className="payment-modal-sub">
              Amount Due: <strong>{formatCurrency(pendingOrderData.totals.total)}</strong> for Order #{pendingOrderData.orderNumber}
            </p>

            <div className="payment-tabs-row">
              <button
                type="button"
                className={`btn-pay-method ${paymentMethod === 'CARD' ? 'is-selected' : ''}`}
                onClick={() => setPaymentMethod('CARD')}
              >
                Credit / Debit Card
              </button>
              <button
                type="button"
                className={`btn-pay-method ${paymentMethod === 'EFT' ? 'is-selected' : ''}`}
                onClick={() => setPaymentMethod('EFT')}
              >
                Instant EFT
              </button>
            </div>

            {paymentMethod === 'CARD' ? (
              <div>
                <div className="payment-input-group">
                  <label htmlFor="card-name" className="payment-input-label">Cardholder Name</label>
                  <input
                    id="card-name"
                    type="text"
                    className="payment-input"
                    placeholder="Name on card"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                  />
                </div>
                <div className="payment-input-group">
                  <label htmlFor="card-number" className="payment-input-label">Card Number</label>
                  <input
                    id="card-number"
                    type="text"
                    className="payment-input"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                  />
                </div>
                <div className="payment-row-split">
                  <div className="payment-input-group">
                    <label htmlFor="card-expiry" className="payment-input-label">Expiry</label>
                    <input
                      id="card-expiry"
                      type="text"
                      className="payment-input"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                    />
                  </div>
                  <div className="payment-input-group">
                    <label htmlFor="card-cvc" className="payment-input-label">CVC</label>
                    <input
                      id="card-cvc"
                      type="text"
                      className="payment-input"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: '#FAF4EC', padding: '16px', borderRadius: '14px', marginBottom: '16px', fontSize: '13px', color: '#7C6053' }}>
                Instant EFT: Your banking portal will securely authorize {formatCurrency(pendingOrderData.totals.total)}.
              </div>
            )}

            {paymentError && (
              <div style={{ color: '#B91C1C', background: '#FEF2F2', padding: '10px 14px', borderRadius: '12px', marginTop: '14px', fontSize: '13px' }}>
                {paymentError}
              </div>
            )}

            <div className="payment-actions-split">
              <button
                type="button"
                className="btn-pay-cancel"
                onClick={() => setShowPaymentModal(false)}
                disabled={processingPayment}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-pay-submit"
                onClick={() => handleExecutePayment('SUCCESS')}
                disabled={processingPayment}
              >
                {processingPayment ? 'Processing...' : `Authorize ${formatCurrency(pendingOrderData.totals.total)}`}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Auth Prompt Modal (For Unauthenticated Customers) */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthModalSuccess}
        packSummary={`Your ${packSize}-Pack Box (${filledDrinksCount} Shakes)`}
      />

      {/* Live Order Tracker Modal */}
      {showOrderTracker && (
        <div className="order-tracker-overlay" onClick={() => setShowOrderTracker(false)}>
          <div className="order-tracker-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="tracker-dialog-header">
              <div className="tracker-brand-tag">
                <span className="tracker-brand-cursive">milky</span>
                <span className="tracker-header-title">Live Kitchen Tracker &amp; Order History</span>
              </div>
              <button
                type="button"
                className="btn-tracker-close"
                onClick={() => setShowOrderTracker(false)}
                aria-label="Close Order Tracker"
              >
                &times;
              </button>
            </div>

            <div className="tracker-dialog-body">
              <div className="tracker-toolbar">
                <p className="tracker-intro">
                  Live real-time status of your orders directly connected to our kitchen operations:
                </p>
                <button
                  type="button"
                  className="btn-tracker-refresh"
                  onClick={fetchRecentOrders}
                  disabled={loadingTracker}
                >
                  {loadingTracker ? 'Updating...' : 'Refresh Status'}
                </button>
              </div>

              {loadingTracker && recentOrders.length === 0 ? (
                <div className="tracker-empty-state">
                  <div className="tracker-spinner" />
                  <p>Connecting to kitchen queue...</p>
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="tracker-empty-state">
                  <p>No recent orders found. Place your first artisan milkshake order!</p>
                </div>
              ) : (
                <div className="tracker-orders-list">
                  {recentOrders.map((ord) => (
                    <div key={ord.id || ord.orderNumber} className="tracker-order-card">
                      <div className="tracker-order-top">
                        <div className="tracker-order-num-time">
                          <span className="tracker-order-num">#{ord.orderNumber}</span>
                          <span className="tracker-order-time">
                            {new Date(ord.created_at).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="tracker-order-total-badge">
                          <span className={`tracker-status-pill status-${(ord.status || 'PAID').toLowerCase()}`}>
                            {ord.status || 'PAID'}
                          </span>
                          <strong className="tracker-order-amt">{formatCurrency(ord.totals?.total ?? ord.total_amount ?? 0)}</strong>
                        </div>
                      </div>

                      {/* 4-Step Visual Kitchen Progress */}
                      <div className="tracker-stepper">
                        <div className={`tracker-step ${['PAID', 'PREPARING', 'READY', 'COLLECTED'].includes(ord.status) ? 'is-active' : ''}`}>
                          <span className="tracker-dot" />
                          <span className="tracker-step-lbl">Confirmed &amp; Paid</span>
                        </div>
                        <div className={`tracker-bar ${['PREPARING', 'READY', 'COLLECTED'].includes(ord.status) ? 'is-fill' : ''}`} />
                        <div className={`tracker-step ${['PREPARING', 'READY', 'COLLECTED'].includes(ord.status) ? 'is-active' : ''}`}>
                          <span className="tracker-dot" />
                          <span className="tracker-step-lbl">Blending Shakes</span>
                        </div>
                        <div className={`tracker-bar ${['READY', 'COLLECTED'].includes(ord.status) ? 'is-fill' : ''}`} />
                        <div className={`tracker-step ${['READY', 'COLLECTED'].includes(ord.status) ? 'is-active' : ''}`}>
                          <span className="tracker-dot" />
                          <span className="tracker-step-lbl">Ready for Pick Up</span>
                        </div>
                        <div className={`tracker-bar ${ord.status === 'COLLECTED' ? 'is-fill' : ''}`} />
                        <div className={`tracker-step ${ord.status === 'COLLECTED' ? 'is-active' : ''}`}>
                          <span className="tracker-dot" />
                          <span className="tracker-step-lbl">Collected</span>
                        </div>
                      </div>

                      {/* Drinks preview */}
                      <div className="tracker-drinks-list">
                        {(ord.items || []).map((it, idx) => (
                          <span key={idx} className="tracker-drink-tag">
                            {it.flavour} ({it.consistency}{it.topping ? `, ${it.topping}` : ''})
                          </span>
                        ))}
                      </div>

                      <div className="tracker-actions">
                        <button
                          type="button"
                          className="btn-view-receipt"
                          onClick={() => {
                            setPlacedOrder(ord);
                            setShowOrderTracker(false);
                          }}
                        >
                          View Thermal Receipt
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
