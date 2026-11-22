import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '@milky-shakes/shared';
import './ReceiptPrinter.css';

// SVG Icons (ZERO EMOJIS)
export function IconCircleNotch({ className = '', size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export function IconCheckCircle({ className = '', size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.15" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function IconHouse({ className = '', size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export function IconPrint({ className = '', size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

export function IconSparkles({ className = '', size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// Thermal receipt cut tooth clip-path
const receiptToothCount = 40;
const receiptToothDepth = 5;
const receiptToothPoints = Array.from({ length: receiptToothCount * 2 }, (_, index) => {
  const x = 100 - ((index + 1) * 100) / (receiptToothCount * 2);
  const y = index % 2 === 0 ? '100%' : `calc(100% - ${receiptToothDepth}px)`;
  return `${x.toFixed(2)}% ${y}`;
}).join(', ');
export const receiptClipPath = `polygon(0 0, 100% 0, 100% calc(100% - ${receiptToothDepth}px), ${receiptToothPoints})`;

// Status labels
const defaultStatusLabels = {
  processing: 'Processing payment & verifying pack...',
  printing: 'Printing artisan thermal receipt...',
  complete: 'Order complete & verified!',
};

// Receipt Printer Context
const ReceiptPrinterContext = createContext(null);

export function useReceiptPrinter(component = 'ReceiptPrinter') {
  const context = useContext(ReceiptPrinterContext);
  if (!context) {
    throw new Error(`${component} must be used inside ReceiptPrinter.Root.`);
  }
  return context;
}

// Compound Components
export function ReceiptPrinterRoot({
  stage = 'complete', // 'processing' | 'printing' | 'complete'
  feedMotion = 'stepped', // 'stepped' | 'smooth'
  animate = true,
  children,
  className = '',
  ...props
}) {
  const value = useMemo(
    () => ({
      stage,
      feedMotion,
      animate,
    }),
    [stage, feedMotion, animate]
  );

  return (
    <ReceiptPrinterContext.Provider value={value}>
      <section
        aria-label="Artisan thermal receipt printer"
        className={`receipt-printer-root ${className}`}
        data-stage={stage}
        {...props}
      >
        {children}
      </section>
    </ReceiptPrinterContext.Provider>
  );
}

export function ReceiptPrinterMachine({ children, className = '', ...props }) {
  return (
    <div className={`receipt-printer-machine ${className}`} {...props}>
      {children}
      <div aria-hidden="true" className="receipt-printer-aperture" />
    </div>
  );
}

export function ReceiptPrinterHeader({ children, className = '', ...props }) {
  return (
    <div className={`receipt-printer-header ${className}`} {...props}>
      {children}
    </div>
  );
}

export function ReceiptPrinterScreen({ children, className = '', ...props }) {
  return (
    <div className={`receipt-printer-screen ${className}`} {...props}>
      {children}
    </div>
  );
}

export function ReceiptPrinterStatus({ children, className = '', ...props }) {
  const { stage } = useReceiptPrinter('ReceiptPrinter.Status');
  const isComplete = stage === 'complete';

  return (
    <div className={`receipt-printer-status ${className}`} {...props}>
      <div className="printer-status-icon-wrap" aria-hidden="true">
        {isComplete ? (
          <IconCheckCircle className="printer-status-check" size={20} />
        ) : (
          <IconCircleNotch className="printer-spinner" size={18} />
        )}
      </div>
      <div className="printer-status-text" role="status" aria-live="polite">
        {children ?? defaultStatusLabels[stage]}
      </div>
    </div>
  );
}

export function ReceiptPrinterOutput({ children, className = '', ...props }) {
  const { stage, feedMotion } = useReceiptPrinter('ReceiptPrinter.Output');
  const feedClass = feedMotion === 'smooth' ? 'is-smooth' : 'is-stepped';

  return (
    <div className={`receipt-printer-output ${className}`} {...props}>
      <div aria-hidden="true" className="receipt-output-shadow" />
      <div
        className={`receipt-paper-wrapper ${feedClass}`}
        data-stage={stage}
      >
        {children}
      </div>
    </div>
  );
}

export function ReceiptPrinterPaper({ children, className = '', style = {}, ...props }) {
  return (
    <article
      className={`receipt-printer-paper ${className}`}
      style={{ clipPath: receiptClipPath, ...style }}
      {...props}
    >
      {children}
    </article>
  );
}

export const ReceiptPrinter = {
  Root: ReceiptPrinterRoot,
  Machine: ReceiptPrinterMachine,
  Header: ReceiptPrinterHeader,
  Screen: ReceiptPrinterScreen,
  Status: ReceiptPrinterStatus,
  Output: ReceiptPrinterOutput,
  Paper: ReceiptPrinterPaper,
};

// Realistic Thermal Barcode Component
function BarcodeSVG({ value = 'MSD-20261122' }) {
  return (
    <div className="paper-barcode-wrap" title={`Barcode ${value}`}>
      <svg className="paper-barcode-svg" viewBox="0 0 200 40" preserveAspectRatio="none">
        <rect x="0" y="0" width="200" height="40" fill="#FFFDF9" />
        {/* Render clean barcode lines */}
        {[
          3, 2, 4, 1, 3, 5, 2, 3, 1, 4, 2, 5, 3, 2, 1, 4, 3, 2, 5, 1, 2, 4, 3, 1, 5, 2, 3, 4, 1, 2,
        ].map((w, idx) => {
          const x = 10 + idx * 6;
          return <rect key={idx} x={x} y="4" width={w > 3 ? 3 : 1.5} height="28" fill="#26160F" />;
        })}
      </svg>
      <div style={{ fontSize: '9px', letterSpacing: '0.25em', marginTop: '2px', color: '#6B5548' }}>
        *{value}*
      </div>
    </div>
  );
}

/**
 * Pre-composed, brand-tailored Receipt Printer whenever a payment succeeds.
 * Sequences through: 'processing' -> 'printing' -> 'complete'
 */
export function MilkyReceiptPrinter({
  order,
  onReset = () => {},
  onHome = () => {},
  autoPlay = true,
}) {
  const [stage, setStage] = useState(() => (autoPlay ? 'processing' : 'complete'));

  useEffect(() => {
    if (!autoPlay) return;

    // 1. Processing phase (payment verification)
    const timer1 = setTimeout(() => {
      setStage('printing');
    }, 900);

    // 2. Printing phase (stepped paper feed)
    const timer2 = setTimeout(() => {
      setStage('complete');
    }, 3400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [autoPlay]);

  if (!order) return null;

  const orderNum = order.orderNumber || order.order_number || 'MSD-000000';
  const receiptRef = order.payment?.receiptNumber || `RCP-${orderNum}`;
  const totalAmount = order.totals?.total ?? order.total_amount ?? 0;
  const subtotal = order.totals?.subtotal ?? order.subtotal_amount ?? 0;
  const discountAmount = order.totals?.discountAmount ?? order.discount_amount ?? 0;
  const vatAmount = order.totals?.vat ?? order.vat_amount ?? 0;
  const deliveryFee = order.totals?.deliveryFee ?? order.delivery_fee ?? 0;
  const fulfillmentMode = order.fulfillment?.mode || order.fulfillment_mode || 'PICKUP';
  const isPickup = fulfillmentMode === 'PICKUP';
  const storeName = order.fulfillment?.restaurantName || 'Toppan Security — Irene HQ (Centurion / Pretoria)';
  const storeAddress = order.fulfillment?.restaurantAddress || '1st Floor, Block B, Southdowns Office Park, Irene, 0157';
  const settledAt = order.payment?.settledAt
    ? new Date(order.payment.settledAt).toLocaleString()
    : new Date().toLocaleString();

  return (
    <div className="milky-receipt-printer-container">
      <ReceiptPrinter.Root stage={stage} feedMotion="stepped">
        <ReceiptPrinter.Machine>
          <ReceiptPrinter.Header>
            <div className="printer-brand-logo">milky</div>
            <button
              type="button"
              className="printer-tactile-btn"
              onClick={onHome}
              title="Return to home page"
            >
              <IconHouse size={13} />
              Home
            </button>
          </ReceiptPrinter.Header>

          <ReceiptPrinter.Screen>
            <div className="printer-screen-top-row">
              <span className="printer-screen-order-num">#{orderNum}</span>
              <strong className="printer-screen-total">{formatCurrency(totalAmount)}</strong>
            </div>
            <ReceiptPrinter.Status />
          </ReceiptPrinter.Screen>
        </ReceiptPrinter.Machine>

        <ReceiptPrinter.Output>
          <ReceiptPrinter.Paper>
            {/* Header */}
            <div className="paper-header">
              <h2 className="paper-brand-title">milky</h2>
              <div className="paper-tagline">Artisan Milkshake Studio</div>
              <div className="paper-store-info">
                {storeName}
                <br />
                {storeAddress}
              </div>
            </div>

            {/* Metadata */}
            <div className="paper-meta-section">
              <div className="paper-meta-row">
                <span className="paper-meta-label">TAX INVOICE:</span>
                <span className="paper-meta-val">#{orderNum}</span>
              </div>
              <div className="paper-meta-row">
                <span className="paper-meta-label">DATE & TIME:</span>
                <span className="paper-meta-val">{settledAt}</span>
              </div>
              <div className="paper-meta-row">
                <span className="paper-meta-label">FULFILLMENT:</span>
                <span className="paper-meta-val">
                  {isPickup ? 'Store Pickup (Counter)' : 'Cold-Lock Courier Delivery'}
                </span>
              </div>
              {isPickup && order.fulfillment?.pickupTimeSlot && (
                <div className="paper-meta-row">
                  <span className="paper-meta-label">COLLECTION:</span>
                  <span className="paper-meta-val">{order.fulfillment.pickupTimeSlot}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="paper-items-section">
              <div className="paper-items-heading">
                Artisan Custom Crate ({order.items?.length || order.number_of_drinks || 1} Shakes)
              </div>
              {order.items &&
                order.items.map((item, idx) => (
                  <div key={idx} className="paper-item-row">
                    <div className="paper-item-top">
                      <span>
                        Slot {item.number || idx + 1}: {item.flavour}
                      </span>
                      <span>{formatCurrency(item.cost)}</span>
                    </div>
                    <div className="paper-item-sub">
                      {item.consistency} | Topping: {item.topping}
                    </div>
                  </div>
                ))}
            </div>

            {/* Totals */}
            <div className="paper-totals-section">
              <div className="paper-total-row">
                <span>SUBTOTAL</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="paper-total-row is-discount">
                  <span>VOLUME DISCOUNT</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="paper-total-row">
                <span>VAT (15% INCLUDED)</span>
                <span>{formatCurrency(vatAmount)}</span>
              </div>
              <div className="paper-total-row">
                <span>FULFILLMENT</span>
                <span>{deliveryFee > 0 ? formatCurrency(deliveryFee) : 'FREE'}</span>
              </div>
              <div className="paper-grand-total">
                <span>TOTAL PAID</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Payment Verification */}
            <div className="paper-payment-section">
              <div className="paper-meta-row">
                <span>PAYMENT METHOD:</span>
                <span style={{ fontWeight: 700 }}>
                  {order.payment?.paymentMethod || 'Visa ending in 4242'}
                </span>
              </div>
              <div className="paper-meta-row">
                <span>RECEIPT REF:</span>
                <span style={{ fontWeight: 700 }}>{receiptRef}</span>
              </div>
              <div className="paper-meta-row">
                <span>AUTH STATUS:</span>
                <span style={{ color: '#15803D', fontWeight: 800 }}>APPROVED / SETTLED</span>
              </div>
            </div>

            {/* Barcode */}
            <BarcodeSVG value={receiptRef} />

            {/* Footer */}
            <div className="paper-footer-msg">
              *** THANK YOU FOR SIPPING ARTISAN ***
              <br />
              Sub-Zero Cold-Lock Guaranteed for 60 Mins
              <br />
              Keep frosty & have a sweet day!
            </div>
          </ReceiptPrinter.Paper>
        </ReceiptPrinter.Output>
      </ReceiptPrinter.Root>

      {/* Action Buttons beneath printer */}
      <div className="receipt-printer-actions">
        <button
          type="button"
          className="btn-printer-action is-ghost"
          onClick={() => window.print()}
          title="Print physical thermal copy"
        >
          <IconPrint size={16} />
          Print Receipt
        </button>
        <button
          type="button"
          className="btn-printer-action is-primary"
          onClick={onReset}
          title="Start building a new pack"
        >
          <IconSparkles size={15} />
          Build Another Pack &rarr;
        </button>
      </div>
    </div>
  );
}

export default ReceiptPrinter;
