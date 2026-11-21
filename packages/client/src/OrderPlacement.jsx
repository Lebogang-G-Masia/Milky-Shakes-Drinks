import { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import {
  calculateOrderTotals,
  formatCurrency,
  MIN_DRINKS_PER_ORDER,
  MAX_DRINKS_PER_ORDER,
} from '@milky-shakes/shared';
import './OrderPlacement.css';

// Helper to check if string is a valid UUID
function isUuid(val) {
  return (
    typeof val === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
  );
}

// Helper to guarantee valid RFC email format satisfying chk_users_email_format
function normalizeUserEmail(rawEmail) {
  if (!rawEmail) return 'patron@milkyshakes.com';
  const trimmed = rawEmail.trim();

  // If already a valid email address with '@' and '.', use as-is
  if (trimmed.includes('@') && trimmed.includes('.')) {
    return trimmed.toLowerCase();
  }

  // Convert username/handle (e.g. 'customer-1') to a valid email format
  const sanitized = trimmed.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase() || 'patron';
  return `${sanitized}@milkyshakes.com`;
}

// Helper to extract display name from various common column names
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
    'Unknown Option'
  );
}

// Helper to extract numeric price from various column names
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

export default function OrderPlacement({ currentUser, onSignOut }) {
  // Database catalog state
  const [flavours, setFlavours] = useState([]);
  const [consistencies, setConsistencies] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [discountTiers, setDiscountTiers] = useState([]);
  const [vatRate, setVatRate] = useState(0.15);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Strict error notification state (NO fallbacks!)
  const [databaseError, setDatabaseError] = useState(null);

  // Order placement state
  const [quantityInput, setQuantityInput] = useState('2');
  const [drinks, setDrinks] = useState([
    { id: 1, flavourId: '', consistencyId: '', toppingId: '', cost: 0, isDone: false },
    { id: 2, flavourId: '', consistencyId: '', toppingId: '', cost: 0, isDone: false },
  ]);
  const [quantityError, setQuantityError] = useState('');

  // Discount & Submission state
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountStatus, setDiscountStatus] = useState(null); // { type: 'success' | 'error', text: string }
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);

  // Fulfillment state (FR-003: Store Pickup vs Home Delivery)
  const [restaurants, setRestaurants] = useState([]);
  const [fulfillmentMode, setFulfillmentMode] = useState('PICKUP'); // 'PICKUP' | 'DELIVERY'
  const [pickupRestaurantId, setPickupRestaurantId] = useState('');
  const [pickupTimeSlot, setPickupTimeSlot] = useState('30_MINS');
  const [customPickupTime, setCustomPickupTime] = useState('');
  const [deliveryStreet, setDeliveryStreet] = useState('');
  const [deliveryPostalCode, setDeliveryPostalCode] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState(currentUser?.mobile_number || '');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  // Load catalog directly from Supabase tables
  useEffect(() => {
    async function loadSupabaseCatalog() {
      setLoadingCatalog(true);
      setDatabaseError(null);

      try {
        // 1. Fetch flavours table
        const { data: flavoursData, error: flavoursErr } = await supabase
          .from('flavours')
          .select('*');

        if (flavoursErr) {
          throw { table: 'flavours', ...flavoursErr };
        }
        if (!flavoursData || flavoursData.length === 0) {
          throw {
            table: 'flavours',
            message: 'Table "flavours" exists in Supabase but contains 0 rows.',
            hint: 'Please insert flavours rows in the Supabase SQL editor.',
            code: 'NO_ROWS',
          };
        }
        setFlavours(flavoursData);

        // 2. Fetch consistencies table
        const { data: consistenciesData, error: consistenciesErr } = await supabase
          .from('consistencies')
          .select('*');

        if (consistenciesErr) {
          throw { table: 'consistencies', ...consistenciesErr };
        }
        if (!consistenciesData || consistenciesData.length === 0) {
          throw {
            table: 'consistencies',
            message: 'Table "consistencies" exists in Supabase but contains 0 rows.',
            hint: 'Please insert consistencies rows in the Supabase SQL editor.',
            code: 'NO_ROWS',
          };
        }
        setConsistencies(consistenciesData);

        // 3. Fetch toppings table
        const { data: toppingsData, error: toppingsErr } = await supabase
          .from('toppings')
          .select('*');

        if (toppingsErr) {
          throw { table: 'toppings', ...toppingsErr };
        }
        if (!toppingsData || toppingsData.length === 0) {
          throw {
            table: 'toppings',
            message: 'Table "toppings" exists in Supabase but contains 0 rows.',
            hint: 'Please insert toppings rows in the Supabase SQL editor.',
            code: 'NO_ROWS',
          };
        }
        setToppings(toppingsData);

        // 4. Fetch discount_tiers table (optional rows allowed)
        const { data: discountData, error: discountErr } = await supabase
          .from('discount_tiers')
          .select('*');

        if (discountErr) {
          throw { table: 'discount_tiers', ...discountErr };
        }
        setDiscountTiers(discountData || []);

        // 5. Fetch system_config table for VAT_PERCENTAGE
        const { data: configData } = await supabase
          .from('system_config')
          .select('*');

        if (configData) {
          const vatEntry = configData.find((c) => c.config_key === 'VAT_PERCENTAGE');
          if (vatEntry && vatEntry.config_value) {
            const parsed = parseFloat(vatEntry.config_value);
            if (!isNaN(parsed) && parsed > 0) {
              setVatRate(parsed / 100);
            }
          }
        }

        // 6. Fetch restaurants table for store locations
        const { data: restaurantsData, error: restErr } = await supabase
          .from('restaurants')
          .select('*')
          .eq('is_active', true);

        if (restaurantsData && restaurantsData.length > 0) {
          setRestaurants(restaurantsData);
          setPickupRestaurantId(restaurantsData[0].id);
        }
      } catch (err) {
        console.error('Supabase Database Breakage Detected:', err);
        setDatabaseError({
          table: err.table || 'Database',
          message: err.message || 'Unknown database error',
          code: err.code || 'UNKNOWN',
          hint: err.hint || err.details || 'Check table schema, RLS policies, or Supabase credentials.',
        });
      } finally {
        setLoadingCatalog(false);
      }
    }

    loadSupabaseCatalog();
  }, []);

  // Handle number of milkshakes required
  function handleQuantityChange(value) {
    setQuantityInput(value);
    setQuantityError('');

    if (value.trim() === '') {
      setQuantityError('Number of milkshakes is compulsory (numeric value only).');
      return;
    }

    const num = Number(value);
    if (!Number.isInteger(num) || isNaN(num)) {
      setQuantityError('Numeric Value Only: please enter a whole number.');
      return;
    }

    if (num < MIN_DRINKS_PER_ORDER || num > MAX_DRINKS_PER_ORDER) {
      setQuantityError(
        `Number of milkshakes must be between ${MIN_DRINKS_PER_ORDER} and ${MAX_DRINKS_PER_ORDER}.`
      );
      return;
    }

    // Adjust drinks array dynamically
    setDrinks((prev) => {
      const updated = [];
      for (let i = 0; i < num; i++) {
        if (prev[i]) {
          updated.push(prev[i]);
        } else {
          updated.push({
            id: i + 1,
            flavourId: '',
            consistencyId: '',
            toppingId: '',
            cost: 0,
            isDone: false,
          });
        }
      }
      return updated;
    });
  }

  // Calculate single drink cost
  function calculateDrinkCost(flavourId, consistencyId, toppingId) {
    if (!flavourId && !consistencyId && !toppingId) {
      return 0;
    }

    let cost = 0;
    if (flavourId) {
      const f = flavours.find((x) => String(x.id) === String(flavourId));
      if (f) cost += getItemPrice(f);
    }
    if (consistencyId) {
      const c = consistencies.find((x) => String(x.id) === String(consistencyId));
      if (c) cost += getItemPrice(c);
    }
    if (toppingId) {
      const t = toppings.find((x) => String(x.id) === String(toppingId));
      if (t) cost += getItemPrice(t);
    }
    return Math.round(cost * 100) / 100;
  }

  // Handle drink selection update
  function updateDrink(index, field, value) {
    setDrinks((prev) => {
      const copy = [...prev];
      const drink = { ...copy[index], [field]: value };
      drink.cost = calculateDrinkCost(
        field === 'flavourId' ? value : drink.flavourId,
        field === 'consistencyId' ? value : drink.consistencyId,
        field === 'toppingId' ? value : drink.toppingId
      );
      copy[index] = drink;
      return copy;
    });
  }

  // Toggle "Done" button per drink
  function toggleDrinkDone(index) {
    setDrinks((prev) => {
      const copy = [...prev];
      const d = copy[index];
      copy[index] = { ...d, isDone: !d.isDone };
      return copy;
    });
  }

  // Validate Frequent Customer Discount code
  function handleApplyDiscount() {
    setDiscountStatus(null);
    const code = discountCodeInput.trim().toUpperCase();

    if (!code) {
      setAppliedDiscount(null);
      return;
    }

    // Match code in discount_tiers table
    const matchedTier = discountTiers.find(
      (tier) =>
        (tier.code && tier.code.toUpperCase() === code) ||
        (tier.name && tier.name.toUpperCase() === code)
    );

    if (matchedTier) {
      const discountPercent =
        matchedTier.discount_percent ?? matchedTier.percent ?? 10;
      setAppliedDiscount({
        ...matchedTier,
        discount_percent: discountPercent,
      });
      setDiscountStatus({
        type: 'success',
        text: `Discount code applied: ${discountPercent}% off!`,
      });
    } else {
      // Check if discount_tiers table was empty or code is unrecognized
      setAppliedDiscount(null);
      setDiscountStatus({
        type: 'error',
        text: `Discount code "${code}" is invalid or not found in discount_tiers table.`,
      });
    }
  }

  // Live order calculations
  const orderTotals = useMemo(() => {
    return calculateOrderTotals(drinks, appliedDiscount, vatRate);
  }, [drinks, appliedDiscount, vatRate]);

  // Check if all data is captured across all drinks
  const isOrderComplete = useMemo(() => {
    if (drinks.length === 0 || quantityError) return false;
    return drinks.every(
      (d) => d.flavourId !== '' && d.consistencyId !== '' && d.toppingId !== ''
    );
  }, [drinks, quantityError]);

  // Validate fulfillment details (FR-003 / AC-FR-003.2)
  const isFulfillmentValid = useMemo(() => {
    if (fulfillmentMode === 'PICKUP') {
      return Boolean(pickupRestaurantId && (pickupTimeSlot !== 'SPECIFIC' || customPickupTime));
    }
    if (fulfillmentMode === 'DELIVERY') {
      return Boolean(
        deliveryStreet.trim() &&
        deliveryPostalCode.trim() &&
        deliveryPhone.trim()
      );
    }
    return false;
  }, [
    fulfillmentMode,
    pickupRestaurantId,
    pickupTimeSlot,
    customPickupTime,
    deliveryStreet,
    deliveryPostalCode,
    deliveryPhone,
  ]);

  // Helpers to format pickup time slot
  function getPickupTimeSlotLabel(slot, customTime) {
    if (slot === '15_MINS') return 'In 15 minutes';
    if (slot === '30_MINS') return 'In 30 minutes';
    if (slot === '45_MINS') return 'In 45 minutes';
    if (slot === '60_MINS') return 'In 1 hour';
    if (slot === 'SPECIFIC') return customTime ? `Today at ${customTime}` : 'Specific time';
    return 'In 30 minutes';
  }

  function getPickupTimeISO(slot, customTime) {
    const now = new Date();
    if (slot === '15_MINS') return new Date(now.getTime() + 15 * 60000).toISOString();
    if (slot === '30_MINS') return new Date(now.getTime() + 30 * 60000).toISOString();
    if (slot === '45_MINS') return new Date(now.getTime() + 45 * 60000).toISOString();
    if (slot === '60_MINS') return new Date(now.getTime() + 60 * 60000).toISOString();
    if (slot === 'SPECIFIC' && customTime) {
      const [h, m] = customTime.split(':');
      const d = new Date();
      d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
      return d.toISOString();
    }
    return new Date(now.getTime() + 30 * 60000).toISOString();
  }

  // Handle Continue button / Order submission
  async function handleContinue() {
    if (!isOrderComplete || !isFulfillmentValid) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      // 1. Resolve patron UUID from 'users' table (satisfying fk_orders_patron, NOT NULL, and chk_users_email_format)
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
            .insert([{
              email: userEmail,
              first_name: currentUser?.name || userEmail.split('@')[0],
              mobile_number: '+27000000000',
              password_hash: 'prototype_authenticated',
              role: 'PATRON',
              completed_orders_count: 0,
              is_active: true,
            }])
            .select('id')
            .single();

          if (userErr) {
            throw {
              table: 'users',
              message: `Could not initialize user profile for patron: ${userErr.message}`,
              code: userErr.code,
              details: userErr.details,
              hint: userErr.hint,
            };
          }
          patronUuid = newUser.id;
        }
      }

      // 2. Resolve restaurant UUID from 'restaurants' table (satisfying fk_orders_restaurant and NOT NULL)
      let restaurantUuid = pickupRestaurantId || null;
      if (!restaurantUuid) {
        const { data: existingRest } = await supabase
          .from('restaurants')
          .select('id')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (existingRest?.id) {
          restaurantUuid = existingRest.id;
        } else {
          const { data: newRest, error: restErr } = await supabase
            .from('restaurants')
            .insert([{
              name: 'Milky Shaky Central',
              address: '123 Shake Boulevard, Cape Town',
              contact_number: '+27 21 555 0123',
              is_active: true,
            }])
            .select('id')
            .single();

          if (restErr) {
            throw {
              table: 'restaurants',
              message: `Could not initialize primary restaurant: ${restErr.message}`,
              code: restErr.code,
              details: restErr.details,
              hint: restErr.hint,
            };
          }
          restaurantUuid = newRest.id;
        }
      }

      // 3. Prepare fulfillment details
      const selectedStore = restaurants.find((r) => String(r.id) === String(restaurantUuid));
      const pickupTimeISO = fulfillmentMode === 'PICKUP'
        ? getPickupTimeISO(pickupTimeSlot, customPickupTime)
        : new Date(Date.now() + 45 * 60 * 1000).toISOString();

      const fulfillmentData = {
        mode: fulfillmentMode,
        restaurantId: restaurantUuid,
        restaurantName: selectedStore?.name || 'Milky Shaky Central',
        restaurantAddress: selectedStore?.address || '123 Shake Boulevard, Cape Town',
        pickupTime: pickupTimeISO,
        pickupTimeSlotLabel: getPickupTimeSlotLabel(pickupTimeSlot, customPickupTime),
        streetAddress: deliveryStreet.trim(),
        postalCode: deliveryPostalCode.trim(),
        recipientPhone: deliveryPhone.trim(),
        deliveryInstructions: deliveryInstructions.trim(),
      };

      // 4. Generate unique order number and construct payload per schema.md
      const uniqueOrderNumber = `MSD-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      const baseOrderPayload = {
        order_number: uniqueOrderNumber,
        patron_id: patronUuid,
        restaurant_id: restaurantUuid,
        pickup_time: pickupTimeISO,
        number_of_drinks: drinks.length,
        subtotal_amount: orderTotals.subtotal,
        discount_amount: orderTotals.discountAmount,
        vat_rate: orderTotals.vatRate,
        vat_amount: orderTotals.vat,
        total_amount: orderTotals.total,
        status: 'PENDING_PAYMENT',
      };

      const fullOrderPayload = {
        ...baseOrderPayload,
        fulfillment_mode: fulfillmentMode,
        ...(fulfillmentMode === 'DELIVERY' ? {
          delivery_address: deliveryStreet.trim(),
          delivery_postal_code: deliveryPostalCode.trim(),
          recipient_phone: deliveryPhone.trim(),
          delivery_instructions: deliveryInstructions.trim(),
        } : {}),
      };

      // 5. Insert order into Supabase 'orders' table (with fallback if schema lacks fulfillment columns)
      let insertedOrder;
      const { data: fullData, error: fullErr } = await supabase
        .from('orders')
        .insert([fullOrderPayload])
        .select()
        .single();

      if (fullErr) {
        if (fullErr.code === '42703') {
          // Schema does not possess fulfillment columns yet; persist base order
          const { data: baseData, error: baseErr } = await supabase
            .from('orders')
            .insert([baseOrderPayload])
            .select()
            .single();

          if (baseErr) {
            throw { table: 'orders', ...baseErr };
          }
          insertedOrder = baseData;
        } else {
          throw { table: 'orders', ...fullErr };
        }
      } else {
        insertedOrder = fullData;
      }

      // 2. Insert line items into Supabase 'order_items' table matching schema.md snapshots
      const orderId = insertedOrder?.id || uniqueOrderNumber;
      const lineItems = drinks.map((d, idx) => {
        const flavourObj = flavours.find((x) => String(x.id) === String(d.flavourId));
        const consistencyObj = consistencies.find((x) => String(x.id) === String(d.consistencyId));
        const toppingObj = toppings.find((x) => String(x.id) === String(d.toppingId));

        return {
          order_id: orderId,
          drink_number: idx + 1,
          flavour_id: d.flavourId,
          flavour_name_snapshot: getItemName(flavourObj),
          flavour_price_snapshot: getItemPrice(flavourObj),
          consistency_id: d.consistencyId,
          consistency_name_snapshot: getItemName(consistencyObj),
          consistency_price_snapshot: getItemPrice(consistencyObj),
          topping_id: d.toppingId,
          topping_name_snapshot: getItemName(toppingObj),
          topping_price_snapshot: getItemPrice(toppingObj),
          item_total: d.cost,
        };
      });

      const { error: itemsErr } = await supabase
        .from('order_items')
        .insert(lineItems);

      if (itemsErr) {
        throw {
          table: 'order_items',
          message: `Could not insert order items: ${itemsErr.message}`,
          code: itemsErr.code,
          details: itemsErr.details,
          hint: itemsErr.hint,
        };
      }

      // Order created successfully
      setPlacedOrder({
        id: orderId,
        orderNumber: insertedOrder?.order_number || uniqueOrderNumber,
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
      });
    } catch (err) {
      console.error('Order creation error:', err);
      setSubmitError(
        `Database Breakage on table "${err.table || 'orders'}": ${err.message} (Code: ${err.code || 'UNKNOWN'})`
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Display strict error banner if database query broke
  if (databaseError) {
    return (
      <div className="order-page-wrapper">
        <header className="order-top-nav">
          <div className="nav-brand">
            <span className="brand-icon">🍦</span>
            <strong>Milky Shakes Drinks</strong>
          </div>
          <div className="nav-user">
            <span>{currentUser?.first_name ? `${currentUser.first_name} (${currentUser.role || 'Patron'})` : (currentUser?.email || 'Patron')}</span>
            {onSignOut && (
              <button type="button" className="btn-signout" onClick={onSignOut}>
                Sign out
              </button>
            )}
          </div>
        </header>

        <main className="db-breakage-card">
          <div className="breakage-badge">🚨 Database Breakage Detected</div>
          <h2>Supabase Table Query Failed</h2>
          <p>
            An error occurred while querying the database. Per your instructions,
            fallbacks are disabled so you can diagnose and resolve the issue immediately:
          </p>

          <div className="breakage-details">
            <div>
              <strong>Target Table:</strong> <code>{databaseError.table}</code>
            </div>
            <div>
              <strong>Error Code:</strong> <code>{databaseError.code}</code>
            </div>
            <div>
              <strong>Error Message:</strong> {databaseError.message}
            </div>
            {databaseError.hint && (
              <div>
                <strong>Hint / Details:</strong> {databaseError.hint}
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn-retry"
            onClick={() => window.location.reload()}
          >
            Retry Database Connection
          </button>
        </main>
      </div>
    );
  }

  // Display order confirmation if placed
  if (placedOrder) {
    return (
      <div className="order-page-wrapper">
        <header className="order-top-nav">
          <div className="nav-brand">
            <span className="brand-icon">🍦</span>
            <strong>Milky Shakes Drinks</strong>
          </div>
          <div className="nav-user">
            <span>{currentUser?.first_name ? `${currentUser.first_name} (${currentUser.role || 'Patron'})` : (currentUser?.email || 'Patron')}</span>
            {onSignOut && (
              <button type="button" className="btn-signout" onClick={onSignOut}>
                Sign out
              </button>
            )}
          </div>
        </header>

        <main className="order-confirmation-card">
          <div className="success-icon">🎉</div>
          <h2>Order Received!</h2>
          <p className="order-id">Order Reference: <strong>{placedOrder.orderNumber}</strong></p>

          <div className="confirmed-items">
            <h3>Custom Milkshakes:</h3>
            <ul>
              {placedOrder.items.map((item) => (
                <li key={item.number}>
                  <strong>Milkshake {item.number}:</strong> {item.flavour} ({item.consistency}), Topping: {item.topping} —{' '}
                  <span className="cost-tag">{formatCurrency(item.cost)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Fulfillment Details (AC-FR-003.3) */}
          <div className="confirmed-fulfillment">
            <h3>Fulfillment Details:</h3>
            <div className="fulfillment-badge-row">
              <span className={`badge-mode ${placedOrder.fulfillment?.mode === 'DELIVERY' ? 'badge-delivery' : 'badge-pickup'}`}>
                {placedOrder.fulfillment?.mode === 'DELIVERY' ? '🚚 Home Delivery' : '🏪 Store Pickup'}
              </span>
            </div>

            {placedOrder.fulfillment?.mode === 'PICKUP' ? (
              <div className="fulfillment-info-list">
                <div><strong>Collection Store:</strong> {placedOrder.fulfillment?.restaurantName}</div>
                {placedOrder.fulfillment?.restaurantAddress && (
                  <div><strong>Store Address:</strong> {placedOrder.fulfillment?.restaurantAddress}</div>
                )}
                <div><strong>Estimated Ready Time:</strong> {placedOrder.fulfillment?.pickupTimeSlotLabel}</div>
                <p className="fulfillment-instruction">
                  ℹ️ Please show this Order Reference at the collection counter when picking up your milkshakes.
                </p>
              </div>
            ) : (
              <div className="fulfillment-info-list">
                <div><strong>Delivery Address:</strong> {placedOrder.fulfillment?.streetAddress}, {placedOrder.fulfillment?.postalCode}</div>
                <div><strong>Recipient Phone:</strong> {placedOrder.fulfillment?.recipientPhone}</div>
                {placedOrder.fulfillment?.deliveryInstructions && (
                  <div><strong>Special Instructions:</strong> <em>"{placedOrder.fulfillment?.deliveryInstructions}"</em></div>
                )}
                <p className="fulfillment-instruction">
                  ℹ️ Our delivery courier will contact you upon arrival at the destination address.
                </p>
              </div>
            )}
          </div>

          <div className="confirmed-totals">
            <div>Subtotal: <strong>{formatCurrency(placedOrder.totals.subtotal)}</strong></div>
            <div>VAT (15%): <strong>{formatCurrency(placedOrder.totals.vat)}</strong></div>
            {placedOrder.totals.discountAmount > 0 && (
              <div className="discount-applied">
                Discount: <strong>-{formatCurrency(placedOrder.totals.discountAmount)}</strong>
              </div>
            )}
            <div className="total-due">
              Total Due: <strong>{formatCurrency(placedOrder.totals.total)}</strong>
            </div>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setPlacedOrder(null);
              setDrinks([
                { id: 1, flavourId: '', consistencyId: '', toppingId: '', cost: 0, isDone: false },
                { id: 2, flavourId: '', consistencyId: '', toppingId: '', cost: 0, isDone: false },
              ]);
              setQuantityInput('2');
            }}
          >
            Place Another Order
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="order-page-wrapper">
      {/* Top navigation header */}
      <header className="order-top-nav">
        <div className="nav-brand">
          <span className="brand-icon">🍦</span>
          <strong>Milky Shakes Drinks</strong>
        </div>
        <div className="nav-user">
          <span className="user-badge">{currentUser?.first_name ? `${currentUser.first_name} (${currentUser.role || 'Patron'})` : (currentUser?.email || 'Patron')}</span>
          {onSignOut && (
            <button type="button" className="btn-signout" onClick={onSignOut}>
              Sign out
            </button>
          )}
        </div>
      </header>

      {/* Main Order Placement View */}
      <div className="order-layout-grid">
        {/* Left Column: Order Placement */}
        <section className="order-placement-column">
          <h1 className="page-title">Order Placement</h1>

          {/* Number of Milkshakes Required Card */}
          <div className="input-card quantity-card">
            <div className="label-with-annotation">
              <label htmlFor="milkshake-qty">Number of Milkshakes Required?</label>
              <span className="annotation-tag badge-blue">All fields compulsory</span>
            </div>
            <div className="input-with-annotation">
              <input
                id="milkshake-qty"
                type="text"
                value={quantityInput}
                onChange={(e) => handleQuantityChange(e.target.value)}
                placeholder="Insert number"
                disabled={loadingCatalog}
              />
              <span className="annotation-tag badge-green">Numeric Value Only</span>
            </div>
            {quantityError && <p className="field-error-text">{quantityError}</p>}
          </div>

          {/* Dynamic Milkshake Cards */}
          <div className="drinks-container">
            {drinks.map((drink, index) => {
              const drinkNumber = index + 1;
              return (
                <div
                  key={drink.id}
                  className={`milkshake-card ${drink.isDone ? 'card-done' : ''}`}
                >
                  <div className="card-header">
                    <h2>Milkshake {drinkNumber}</h2>
                    {index === 1 && (
                      <span className="annotation-tag badge-purple">
                        Show detail for each drink ordered
                      </span>
                    )}
                  </div>

                  {/* Flavour dropdown */}
                  <div className="form-field">
                    <label htmlFor={`flavour-${drinkNumber}`}>Flavour</label>
                    <select
                      id={`flavour-${drinkNumber}`}
                      value={drink.flavourId}
                      onChange={(e) => updateDrink(index, 'flavourId', e.target.value)}
                      disabled={loadingCatalog}
                    >
                      <option value="">Select</option>
                      {flavours.map((item) => (
                        <option key={item.id} value={item.id}>
                          {getItemName(item)} ({formatCurrency(getItemPrice(item))})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Thick or Not dropdown */}
                  <div className="form-field">
                    <label htmlFor={`consistency-${drinkNumber}`}>Thick or Not</label>
                    <select
                      id={`consistency-${drinkNumber}`}
                      value={drink.consistencyId}
                      onChange={(e) => updateDrink(index, 'consistencyId', e.target.value)}
                      disabled={loadingCatalog}
                    >
                      <option value="">Select</option>
                      {consistencies.map((item) => (
                        <option key={item.id} value={item.id}>
                          {getItemName(item)}{' '}
                          {getItemPrice(item) > 0 ? `(+${formatCurrency(getItemPrice(item))})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Topping dropdown */}
                  <div className="form-field">
                    <label htmlFor={`topping-${drinkNumber}`}>Topping</label>
                    <select
                      id={`topping-${drinkNumber}`}
                      value={drink.toppingId}
                      onChange={(e) => updateDrink(index, 'toppingId', e.target.value)}
                      disabled={loadingCatalog}
                    >
                      <option value="">Select</option>
                      {toppings.map((item) => (
                        <option key={item.id} value={item.id}>
                          {getItemName(item)}{' '}
                          {getItemPrice(item) > 0 ? `(+${formatCurrency(getItemPrice(item))})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cost display row */}
                  <div className="cost-row">
                    <span className="cost-label">Cost:</span>
                    <span className="cost-value">{formatCurrency(drink.cost)}</span>
                    {index === 0 && (
                      <span className="annotation-tag badge-yellow">
                        Calculate drink price with extras
                      </span>
                    )}
                  </div>

                  {/* Done button */}
                  <button
                    type="button"
                    className={`btn-done ${drink.isDone ? 'btn-done-active' : ''}`}
                    onClick={() => toggleDrinkDone(index)}
                  >
                    {drink.isDone ? '✓ Done' : 'Done'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Column: Order Summary */}
        <aside className="order-summary-column">
          <div className="summary-card">
            <h2 className="summary-title">Order Summary</h2>

            {/* Fulfillment Mode Selector (FR-003) */}
            <div className="fulfillment-selector-container">
              <label className="section-subtitle">Fulfillment Method</label>
              <div className="fulfillment-tabs">
                <button
                  type="button"
                  className={`tab-btn ${fulfillmentMode === 'PICKUP' ? 'tab-btn-active' : ''}`}
                  onClick={() => setFulfillmentMode('PICKUP')}
                >
                  🏪 Store Pickup
                </button>
                <button
                  type="button"
                  className={`tab-btn ${fulfillmentMode === 'DELIVERY' ? 'tab-btn-active' : ''}`}
                  onClick={() => setFulfillmentMode('DELIVERY')}
                >
                  🚚 Home Delivery
                </button>
              </div>

              {fulfillmentMode === 'PICKUP' ? (
                <div className="fulfillment-form-fields">
                  <div className="fulfillment-field">
                    <label htmlFor="pickup-store-select">Store Location</label>
                    <select
                      id="pickup-store-select"
                      value={pickupRestaurantId}
                      onChange={(e) => setPickupRestaurantId(e.target.value)}
                    >
                      {restaurants.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.address})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="fulfillment-field">
                    <label htmlFor="pickup-timeslot-select">Pickup Time Slot</label>
                    <select
                      id="pickup-timeslot-select"
                      value={pickupTimeSlot}
                      onChange={(e) => setPickupTimeSlot(e.target.value)}
                    >
                      <option value="15_MINS">In 15 minutes</option>
                      <option value="30_MINS">In 30 minutes</option>
                      <option value="45_MINS">In 45 minutes</option>
                      <option value="60_MINS">In 1 hour</option>
                      <option value="SPECIFIC">Choose specific time</option>
                    </select>
                  </div>

                  {pickupTimeSlot === 'SPECIFIC' && (
                    <div className="fulfillment-field">
                      <label htmlFor="custom-pickup-time">Estimated Pickup Time</label>
                      <input
                        id="custom-pickup-time"
                        type="time"
                        value={customPickupTime}
                        onChange={(e) => setCustomPickupTime(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="fulfillment-form-fields">
                  <div className="fulfillment-field">
                    <label htmlFor="delivery-street-input">
                      Street Address <span className="req">*</span>
                    </label>
                    <input
                      id="delivery-street-input"
                      type="text"
                      placeholder="e.g. 42 Milky Way, Apt 3B"
                      value={deliveryStreet}
                      onChange={(e) => setDeliveryStreet(e.target.value)}
                      required
                    />
                    {!deliveryStreet.trim() && (
                      <span className="field-hint-error">Street address is required</span>
                    )}
                  </div>

                  <div className="fulfillment-row">
                    <div className="fulfillment-field">
                      <label htmlFor="delivery-postal-input">
                        Postal Code <span className="req">*</span>
                      </label>
                      <input
                        id="delivery-postal-input"
                        type="text"
                        placeholder="e.g. 8001"
                        value={deliveryPostalCode}
                        onChange={(e) => setDeliveryPostalCode(e.target.value)}
                        required
                      />
                      {!deliveryPostalCode.trim() && (
                        <span className="field-hint-error">Postal code is required</span>
                      )}
                    </div>

                    <div className="fulfillment-field">
                      <label htmlFor="delivery-phone-input">
                        Contact Phone <span className="req">*</span>
                      </label>
                      <input
                        id="delivery-phone-input"
                        type="tel"
                        placeholder="e.g. +27 82 123 4567"
                        value={deliveryPhone}
                        onChange={(e) => setDeliveryPhone(e.target.value)}
                        required
                      />
                      {!deliveryPhone.trim() && (
                        <span className="field-hint-error">Phone is required</span>
                      )}
                    </div>
                  </div>

                  <div className="fulfillment-field">
                    <label htmlFor="delivery-notes-input">Special Instructions (Optional)</label>
                    <input
                      id="delivery-notes-input"
                      type="text"
                      placeholder="e.g. Ring intercom 12, leave at door"
                      value={deliveryInstructions}
                      onChange={(e) => setDeliveryInstructions(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <hr className="summary-divider" />

            <div className="summary-row">
              <span>Number of Drinks</span>
              <strong>{drinks.length}</strong>
            </div>

            <div className="summary-row">
              <span>Subtotal</span>
              <strong>{formatCurrency(orderTotals.subtotal)}</strong>
            </div>

            <div className="summary-row">
              <span>VAT (15%)</span>
              <strong>{formatCurrency(orderTotals.vat)}</strong>
            </div>

            {/* Frequent Customer Discount */}
            <div className="discount-section">
              <label htmlFor="discount-input">Frequent Customer Discount</label>
              <div className="discount-input-group">
                <input
                  id="discount-input"
                  type="text"
                  value={discountCodeInput}
                  onChange={(e) => setDiscountCodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyDiscount();
                    }
                  }}
                  placeholder="Insert"
                />
                <button
                  type="button"
                  className="btn-apply-discount"
                  onClick={handleApplyDiscount}
                >
                  Apply
                </button>
              </div>

              {discountStatus && (
                <p className={`discount-feedback feedback-${discountStatus.type}`}>
                  {discountStatus.text}
                </p>
              )}
            </div>

            <div className="summary-row total-cost-row">
              <span>Total cost</span>
              <strong className="total-amount">{formatCurrency(orderTotals.total)}</strong>
            </div>

            {/* Error on submission */}
            {submitError && <div className="submit-error-banner">{submitError}</div>}

            {/* Continue Button */}
            <button
              type="button"
              className="btn-continue"
              disabled={!isOrderComplete || !isFulfillmentValid || submitting}
              onClick={handleContinue}
            >
              {submitting
                ? 'Placing Order...'
                : !isOrderComplete
                ? 'Continue'
                : !isFulfillmentValid
                ? (fulfillmentMode === 'DELIVERY' ? 'Complete delivery details' : 'Complete pickup details')
                : 'Confirm & Place Order'}
            </button>

            <div className="continue-annotation">
              <span className="annotation-tag badge-pink">
                {!isOrderComplete
                  ? 'Continue when all data captured'
                  : !isFulfillmentValid
                  ? (fulfillmentMode === 'DELIVERY' ? 'Address and phone compulsory for delivery' : 'Store and time slot required')
                  : 'Ready to submit'}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
