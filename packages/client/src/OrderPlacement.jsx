import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from './supabaseClient';
import {
  calculateOrderTotals,
  formatCurrency,
  generateReceiptNumber,
  DEFAULT_DELIVERY_FEE,
  MIN_DRINKS_PER_ORDER,
  MAX_DRINKS_PER_ORDER,
} from '@milky-shakes/shared';
import './OrderPlacement.css';

// Clean SVG Icons (NO EMOJIS)
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

// Helper to check if string is a valid UUID
function isUuid(val) {
  return (
    typeof val === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
  );
}

// Helper to guarantee valid RFC email format
function normalizeUserEmail(rawEmail) {
  if (!rawEmail) return 'patron@milkyshakes.com';
  const trimmed = rawEmail.trim();
  if (trimmed.includes('@') && trimmed.includes('.')) {
    return trimmed.toLowerCase();
  }
  const sanitized = trimmed.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase() || 'patron';
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
  const lower = name.toLowerCase();
  if (lower.includes('strawberry') || lower.includes('jordgubb') || lower.includes('berry')) {
    return {
      liquid: '#F5CCD3',
      swirl: '#BA2E44',
      border: '#BA2E44',
      aura: 'rgba(245, 180, 195, 0.45)',
      image: '/images/Strawberry.png',
      alt: 'Wild Strawberry Artisan Milkshake',
    };
  }
  if (lower.includes('mint') || lower.includes('choklad') || lower.includes('peppermint')) {
    return {
      liquid: '#C6EBDD',
      swirl: '#276E5B',
      border: '#276E5B',
      aura: 'rgba(160, 230, 205, 0.45)',
      image: '/images/mint.png',
      alt: 'Mint Dark Chocolate Artisan Milkshake',
    };
  }
  if (lower.includes('cookie') || lower.includes('kram') || lower.includes('cream')) {
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

export default function OrderPlacement({ currentUser, onSignOut, onBackToLanding }) {
  // Database catalog state
  const [flavours, setFlavours] = useState([]);
  const [consistencies, setConsistencies] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [discountTiers, setDiscountTiers] = useState([]);
  const [vatRate, setVatRate] = useState(0.15);
  const [restaurants, setRestaurants] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [databaseError, setDatabaseError] = useState(null);

  // Box Builder state
  const [packSize, setPackSize] = useState(4); // 2 | 4 | 6
  const [drinks, setDrinks] = useState([
    { id: 1, flavourId: '', consistencyId: '', toppingId: '', cost: 0 },
    { id: 2, flavourId: '', consistencyId: '', toppingId: '', cost: 0 },
    { id: 3, flavourId: '', consistencyId: '', toppingId: '', cost: 0 },
    { id: 4, flavourId: '', consistencyId: '', toppingId: '', cost: 0 },
  ]);
  const [activeSlotIndex, setActiveSlotIndex] = useState(0);

  // Stage toggle: 'builder' | 'review'
  const [currentStage, setCurrentStage] = useState('builder');

  // Fulfillment & Discount state
  const [fulfillmentMode, setFulfillmentMode] = useState('PICKUP'); // 'PICKUP' | 'DELIVERY'
  const [pickupRestaurantId, setPickupRestaurantId] = useState('');
  const [pickupTimeSlot, setPickupTimeSlot] = useState('30_MINS');
  const [customPickupTime, setCustomPickupTime] = useState('');
  const [deliveryStreet, setDeliveryStreet] = useState('');
  const [deliveryPostalCode, setDeliveryPostalCode] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState(currentUser?.mobile_number || '');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountStatus, setDiscountStatus] = useState(null);

  // Payment & Order Submission state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CARD'); // 'CARD' | 'EFT'
  const [cardholderName, setCardholderName] = useState(
    currentUser?.first_name ? `${currentUser.first_name} Patron` : 'Alex Patron'
  );
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('123');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);

  // Load database catalog
  useEffect(() => {
    async function loadCatalog() {
      setLoadingCatalog(true);
      setDatabaseError(null);
      try {
        const { data: fData, error: fErr } = await supabase.from('flavours').select('*');
        if (fErr) throw { table: 'flavours', ...fErr };
        if (!fData || fData.length === 0) throw { table: 'flavours', message: 'No flavour rows found.' };
        setFlavours(fData);

        const { data: cData, error: cErr } = await supabase.from('consistencies').select('*');
        if (cErr) throw { table: 'consistencies', ...cErr };
        if (!cData || cData.length === 0) throw { table: 'consistencies', message: 'No consistency rows found.' };
        setConsistencies(cData);

        const { data: tData, error: tErr } = await supabase.from('toppings').select('*');
        if (tErr) throw { table: 'toppings', ...tErr };
        if (!tData || tData.length === 0) throw { table: 'toppings', message: 'No topping rows found.' };
        setToppings(tData);

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
        if (restData && restData.length > 0) {
          setRestaurants(restData);
          setPickupRestaurantId(restData[0].id);
        }
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
    let cost = 0;
    if (fId) {
      const f = flavours.find((x) => String(x.id) === String(fId));
      if (f) cost += getItemPrice(f);
    }
    if (cId) {
      const c = consistencies.find((x) => String(x.id) === String(cId));
      if (c) cost += getItemPrice(c);
    }
    if (tId) {
      const t = toppings.find((x) => String(x.id) === String(tId));
      if (t) cost += getItemPrice(t);
    }
    return Math.round(cost * 100) / 100;
  }

  // Active Drink Shortcut & Visual Resolution
  const activeDrink = drinks[activeSlotIndex] || drinks[0];
  const activeFlavour = flavours.find((f) => String(f.id) === String(activeDrink?.flavourId));
  const activeConsistency = consistencies.find((c) => String(c.id) === String(activeDrink?.consistencyId));
  const activeTopping = toppings.find((t) => String(t.id) === String(activeDrink?.toppingId));
  const activeVisual = getFlavourVisual(activeFlavour ? getItemName(activeFlavour) : 'Signature');

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

  // Interactive Ingredient Dropper Particles State & Trigger
  const [particles, setParticles] = useState([]);
  const [showRipple, setShowRipple] = useState(false);

  function triggerDropperParticles(toppingName = '') {
    const lower = toppingName.toLowerCase();
    let typeClass = 'type-caramel';
    if (lower.includes('cookie') || lower.includes('oreo')) typeClass = 'type-cookie';
    else if (lower.includes('choc') || lower.includes('flake') || lower.includes('nibs') || lower.includes('brownie')) typeClass = 'type-choc';
    else if (lower.includes('berry') || lower.includes('straw') || lower.includes('sprinkle')) typeClass = 'type-berry';
    else if (lower.includes('marsh') || lower.includes('cream') || lower.includes('whip')) typeClass = 'type-cream';

    const count = 12;
    const newParticles = Array.from({ length: count }).map((_, i) => ({
      id: `${Date.now()}_${i}_${Math.random()}`,
      left: `${46 + (Math.random() * 20 - 10)}%`,
      size: `${6 + Math.floor(Math.random() * 6)}px`,
      delay: `${(i * 0.04).toFixed(2)}s`,
      typeClass,
    }));

    setParticles(newParticles);
    setShowRipple(true);

    setTimeout(() => {
      setShowRipple(false);
    }, 700);

    setTimeout(() => {
      setParticles([]);
    }, 1200);
  }

  function handleSelectTopping(toppingItem) {
    updateActiveDrink('toppingId', toppingItem.id);
    triggerDropperParticles(getItemName(toppingItem));
  }

  // Update field on active drink
  function updateActiveDrink(field, value) {
    setDrinks((prev) => {
      const copy = [...prev];
      const current = { ...copy[activeSlotIndex], [field]: value };
      current.cost = computeDrinkCost(
        field === 'flavourId' ? value : current.flavourId,
        field === 'consistencyId' ? value : current.consistencyId,
        field === 'toppingId' ? value : current.toppingId
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
        const defaultConsistency = consistencies[0];
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

  // Calculate volume discount tier automatically based on pack size
  const effectiveDiscount = useMemo(() => {
    if (appliedDiscount) return appliedDiscount;

    // Check volume discounts: 6 drinks = 15%, 4 drinks = 10%
    const filledCount = drinks.filter((d) => d.flavourId).length;
    if (filledCount >= 6) {
      return { discount_percent: 15, tier_name: '6-Pack VIP Discount' };
    }
    if (filledCount >= 4) {
      return { discount_percent: 10, tier_name: '4-Pack Family Discount' };
    }
    return null;
  }, [drinks, appliedDiscount]);

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

  // Live order totals calculation
  const deliveryFee = fulfillmentMode === 'DELIVERY' ? DEFAULT_DELIVERY_FEE : 0;
  const orderTotals = useMemo(() => {
    return calculateOrderTotals(drinks, effectiveDiscount, vatRate, deliveryFee);
  }, [drinks, effectiveDiscount, vatRate, deliveryFee]);

  // Number of configured drinks
  const filledDrinksCount = drinks.filter((d) => d.flavourId).length;
  const isOrderReady = filledDrinksCount >= MIN_DRINKS_PER_ORDER && drinks.every((d) => d.flavourId);

  // Validate fulfillment
  const isFulfillmentValid = useMemo(() => {
    if (fulfillmentMode === 'PICKUP') {
      return Boolean(pickupRestaurantId);
    }
    if (fulfillmentMode === 'DELIVERY') {
      return Boolean(deliveryStreet.trim() && deliveryPostalCode.trim() && deliveryPhone.trim());
    }
    return false;
  }, [fulfillmentMode, pickupRestaurantId, deliveryStreet, deliveryPostalCode, deliveryPhone]);

  // Handle Order Placement to Supabase
  async function handleProceedToPayment() {
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

      const fulfillmentData = {
        mode: fulfillmentMode,
        restaurantId: fulfillmentMode === 'PICKUP' ? pickupRestaurantId : null,
        restaurantName: selectedRestaurant?.name || 'Milky Shakes Store',
        restaurantAddress: selectedRestaurant?.address || '',
        pickupTimeSlot: fulfillmentMode === 'PICKUP' ? pickupTimeSlot : null,
        streetAddress: fulfillmentMode === 'DELIVERY' ? deliveryStreet.trim() : null,
        postalCode: fulfillmentMode === 'DELIVERY' ? deliveryPostalCode.trim() : null,
        recipientPhone: fulfillmentMode === 'DELIVERY' ? deliveryPhone.trim() : null,
        deliveryInstructions: fulfillmentMode === 'DELIVERY' ? deliveryInstructions.trim() : null,
      };

      const { data: insertedOrder, error: orderErr } = await supabase
        .from('orders')
        .insert([
          {
            order_number: uniqueOrderNumber,
            patron_id: patronUuid,
            status: 'PENDING_PAYMENT',
            fulfillment_mode: fulfillmentMode,
            restaurant_id: fulfillmentMode === 'PICKUP' ? pickupRestaurantId : null,
            subtotal: orderTotals.subtotal,
            discount_amount: orderTotals.discountAmount,
            vat_amount: orderTotals.vat,
            delivery_fee: orderTotals.deliveryFee,
            total_amount: orderTotals.total,
            items_count: drinks.length,
          },
        ])
        .select()
        .single();

      if (orderErr) throw orderErr;

      const orderId = insertedOrder.id;

      // Insert line items
      const lineItems = drinks.map((drink, idx) => ({
        order_id: orderId,
        item_number: idx + 1,
        flavour_id: isUuid(drink.flavourId) ? drink.flavourId : null,
        consistency_id: isUuid(drink.consistencyId) ? drink.consistencyId : null,
        topping_id: isUuid(drink.toppingId) ? drink.toppingId : null,
        unit_price: drink.cost,
        quantity: 1,
        total_price: drink.cost,
      }));

      const { error: itemsErr } = await supabase.from('order_items').insert(lineItems);
      if (itemsErr) throw itemsErr;

      const preparedOrder = {
        orderId,
        orderNumber: insertedOrder.order_number || uniqueOrderNumber,
        fulfillment: fulfillmentData,
        items: drinks.map((d, i) => {
          const f = flavours.find((x) => String(x.id) === String(d.flavourId));
          const c = consistencies.find((x) => String(x.id) === String(d.consistencyId));
          const t = toppings.find((x) => String(x.id) === String(d.toppingId));
          return {
            number: i + 1,
            flavour: getItemName(f),
            consistency: getItemName(c),
            topping: getItemName(t),
            cost: d.cost,
          };
        }),
        totals: orderTotals,
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

      setPlacedOrder({
        ...pendingOrderData,
        status: 'PAID',
        payment: {
          receiptNumber: receiptNum,
          transactionReference: txnRef,
          settledAt: settledTimestamp,
          paymentMethod: paymentMethod === 'CARD' ? `Visa ending in 4242 (${cardholderName})` : 'Instant EFT (Verified)',
          paymentStatus: 'PAID',
        },
      });

      setShowPaymentModal(false);
      setPendingOrderData(null);
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
          <h2 className="box-page-title" style={{ color: '#B91C1C' }}>Database Breakage Notice</h2>
          <p className="box-page-subtitle">Table: {databaseError.table}</p>
          <p style={{ marginTop: '12px', color: '#7C6053' }}>{databaseError.message}</p>
          <button type="button" className="btn-final-checkout" onClick={() => window.location.reload()} style={{ marginTop: '20px', maxWidth: '240px' }}>
            Retry Connection
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
            onClick={onBackToLanding}
            role="button"
            tabIndex={0}
            title="Milky — Artisan Milkshakes"
          >
            milky
          </div>

          <nav className="box-nav-pill-menu" aria-label="Main Navigation">
            {['Packs', 'Flavours', 'Philosophy', 'FAQ'].map((tab) => {
              const isActive = tab === 'Packs';
              return (
                <button
                  key={tab}
                  className={`box-nav-pill-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (tab === 'Packs') {
                      handleResetBox();
                      setPlacedOrder(null);
                      setCurrentStage('builder');
                    } else if (onBackToLanding) {
                      onBackToLanding(tab);
                    }
                  }}
                  type="button"
                >
                  {tab}
                </button>
              );
            })}
          </nav>

          <div className="box-nav-actions">
            {onSignOut && (
              <button
                type="button"
                className="box-btn-ghost-pill signout-btn"
                onClick={onSignOut}
                title="Sign Out"
              >
                Sign Out
              </button>
            )}
          </div>
        </header>

        <main className="confirmed-receipt-card" aria-labelledby="receipt-title">
          <div className="receipt-verified-header">
            <div className="receipt-verified-badge">
              <IconCheck /> Verified Tax Invoice
            </div>
            <h1 id="receipt-title" className="receipt-verified-title">
              Order #{placedOrder.orderNumber} Confirmed
            </h1>
            <p className="receipt-verified-code">
              Receipt Reference: {placedOrder.payment?.receiptNumber}
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '12px' }}>
              Your Custom Artisan Pack ({placedOrder.items.length} Shakes)
            </h3>
            <div className="packed-items-stack">
              {placedOrder.items.map((item) => {
                const visual = getFlavourVisual(item.flavour);
                return (
                  <div key={item.number} className="packed-item-row">
                    <div className="packed-item-left">
                      <span className="packed-item-number">SLOT {item.number}</span>
                      <img
                        src={visual.image}
                        alt={visual.alt}
                        style={{ width: '38px', height: '48px', objectFit: 'contain' }}
                      />
                      <div>
                        <div className="packed-item-title">{item.flavour}</div>
                        <div className="packed-item-sub">
                          {item.consistency} | Topping: {item.topping}
                        </div>
                      </div>
                    </div>
                    <span className="packed-item-price">{formatCurrency(item.cost)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="receipt-table-card">
            <div className="receipt-row">
              <span>Subtotal</span>
              <span>{formatCurrency(placedOrder.totals.subtotal)}</span>
            </div>
            {placedOrder.totals.discountAmount > 0 && (
              <div className="receipt-row is-discount">
                <span>Volume Discount Applied</span>
                <span>-{formatCurrency(placedOrder.totals.discountAmount)}</span>
              </div>
            )}
            <div className="receipt-row">
              <span>VAT (15% Included)</span>
              <span>{formatCurrency(placedOrder.totals.vat)}</span>
            </div>
            <div className="receipt-row">
              <span>Fulfillment ({placedOrder.fulfillment?.mode === 'PICKUP' ? 'Store Pickup' : 'Courier'})</span>
              <span>{placedOrder.totals.deliveryFee > 0 ? formatCurrency(placedOrder.totals.deliveryFee) : 'FREE'}</span>
            </div>
            <div className="receipt-divider" />
            <div className="receipt-total-row">
              <span>Total Paid</span>
              <span className="receipt-total-val">{formatCurrency(placedOrder.totals.total)}</span>
            </div>
          </div>

          <div className="receipt-actions-row">
            <button type="button" className="btn-proceed-review" onClick={() => window.print()} style={{ flex: 1 }}>
              <IconPrint /> Print Receipt
            </button>
            <button
              type="button"
              className="btn-final-checkout"
              onClick={() => {
                setPlacedOrder(null);
                setCurrentStage('builder');
                handleResetBox();
              }}
              style={{ flex: 1.5 }}
            >
              Build Another Pack &rarr;
            </button>
          </div>
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
          onClick={onBackToLanding}
          role="button"
          tabIndex={0}
          title="Milky — Artisan Milkshakes"
        >
          milky
        </div>

        {/* Centered Floating Pill Navigation */}
        <nav className="box-nav-pill-menu" aria-label="Main Navigation">
          {['Packs', 'Flavours', 'Philosophy', 'FAQ'].map((tab) => {
            const isActive = tab === 'Packs';
            return (
              <button
                key={tab}
                className={`box-nav-pill-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (tab === 'Packs') {
                    setCurrentStage('builder');
                  } else if (onBackToLanding) {
                    onBackToLanding(tab);
                  }
                }}
                type="button"
              >
                {tab}
              </button>
            );
          })}
        </nav>

        {/* Right Action Icons / Buttons */}
        <div className="box-nav-actions">
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

          {onSignOut && (
            <button
              type="button"
              className="box-btn-ghost-pill signout-btn"
              onClick={onSignOut}
              title="Sign Out"
            >
              Sign Out
            </button>
          )}
        </div>
      </header>

      {/* Main Studio Area */}
      <main className="box-main-content">
        {/* Header & Gamified Discount Meter */}
        <div className="box-header-row">
          <div className="box-title-pack-header">
            <div>
              <h1 className="box-page-title">
                {currentStage === 'builder' ? `Build Your ${packSize}-Pack Box` : 'Review Box & Fulfillment'}
              </h1>
              <p className="box-page-subtitle">
                {currentStage === 'builder'
                  ? 'Select any slot in your carry box below to customize that milkshake, or use Barista’s Choice to randomize.'
                  : 'All slots configured. Choose store collection or thermal courier delivery.'}
              </p>
            </div>

            {currentStage === 'builder' && (
              <div className="box-pack-size-selector" role="group" aria-label="Pack Size Selector">
                <button
                  type="button"
                  className={`btn-pack-size ${packSize === 2 ? 'is-active' : ''}`}
                  onClick={() => handlePackSizeChange(2)}
                >
                  2-Pack
                </button>
                <button
                  type="button"
                  className={`btn-pack-size ${packSize === 4 ? 'is-active' : ''}`}
                  onClick={() => handlePackSizeChange(4)}
                >
                  4-Pack (10% Off)
                </button>
                <button
                  type="button"
                  className={`btn-pack-size ${packSize === 6 ? 'is-active' : ''}`}
                  onClick={() => handlePackSizeChange(6)}
                >
                  6-Pack (15% Off)
                </button>
              </div>
            )}
          </div>

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

                {/* Interactive Dropper Particles Layer */}
                <div className="ingredient-dropper-layer" aria-hidden="true">
                  {particles.map((p) => (
                    <span
                      key={p.id}
                      className={`dropper-particle ${p.typeClass}`}
                      style={{
                        left: p.left,
                        width: p.size,
                        height: p.size,
                        animationDelay: p.delay,
                      }}
                    />
                  ))}
                  {showRipple && <div className="dropper-landing-ripple" />}
                </div>

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
                  <h3 className="tray-section-title">Artisan Kraft Carry Tray ({packSize} Slots)</h3>
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
                    disabled={!drinks[0]?.flavourId}
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
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`btn-choice-card ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => updateActiveDrink('flavourId', item.id)}
                      >
                        <span className="choice-card-title">{getItemName(item)}</span>
                        <span className="choice-card-meta">{formatCurrency(getItemPrice(item))}</span>
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
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`btn-topping-dropper ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => handleSelectTopping(item)}
                      >
                        {isSelected && <IconCheck />}
                        <span>{getItemName(item)}</span>
                        {extraPrice > 0 && <span style={{ opacity: 0.8 }}>+{formatCurrency(extraPrice)}</span>}
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
                  {filledDrinksCount < packSize
                    ? `Fill ${packSize - filledDrinksCount} more slots to complete your pack.`
                    : effectiveDiscount
                    ? `${effectiveDiscount.tier_name} automatically applied!`
                    : 'All slots locked! Ready for fulfillment.'}
                </p>
                <button
                  type="button"
                  className="btn-proceed-review"
                  onClick={() => setCurrentStage('review')}
                  disabled={filledDrinksCount < MIN_DRINKS_PER_ORDER}
                >
                  Review Box & Fulfillment ({filledDrinksCount} Shakes) &rarr;
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
                    Artisan {packSize}-Pack Crate
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

              {/* Items List */}
              <div className="packed-items-stack">
                {drinks.map((item, idx) => {
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
                          <div className="packed-item-title">{f ? getItemName(f) : 'Unassigned Shake'}</div>
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

              {/* Pickup Location Selector */}
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
                        {r.name} ({r.address || 'Flagship Store'})
                      </option>
                    ))}
                  </select>
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
                  <span>Subtotal ({drinks.length} Milkshakes)</span>
                  <span>{formatCurrency(orderTotals.subtotal)}</span>
                </div>
                {orderTotals.discountAmount > 0 && (
                  <div className="receipt-row is-discount">
                    <span>{effectiveDiscount?.tier_name || 'Volume Discount'}</span>
                    <span>-{formatCurrency(orderTotals.discountAmount)}</span>
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
                disabled={submitting || !isOrderReady || !isFulfillmentValid}
              >
                {submitting ? 'Preparing Checkout...' : `Proceed to Secure Payment (${formatCurrency(orderTotals.total)}) \u2192`}
              </button>

              <div className="checkout-security-footnote">
                <IconLock /> Safe 256-Bit SSL Encrypted Checkout
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Payment Processing Modal (FR-004) */}
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
                Instant EFT simulator: Your banking portal will securely authorize {formatCurrency(pendingOrderData.totals.total)}.
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
    </div>
  );
}
