import nodemailer from 'nodemailer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatCurrency } from '@milky-shakes/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Ensures environment variables from .env.local are loaded if not already populated.
 */
export function loadEnvIfPresent() {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return;
  }
  const candidates = [
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../../.env.local'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(__dirname, '../../.env.local'),
    path.resolve(__dirname, '../../.env'),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      try {
        if (typeof process.loadEnvFile === 'function') {
          process.loadEnvFile(file);
          if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            break;
          }
        }
      } catch {
        // Continue to next candidate
      }
    }
  }
}

/**
 * Builds and returns a Nodemailer transporter configured with SMTP credentials.
 */
export function createTransporter() {
  loadEnvIfPresent();

  const user = process.env.SMTP_USER;
  const rawPass = process.env.SMTP_PASS || '';
  const pass = rawPass.replace(/\s+/g, ''); // strip spaces from Google App Passwords
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Formats date into friendly South African local string
 */
function formatDate(dateValue) {
  try {
    const d = dateValue ? new Date(dateValue) : new Date();
    return d.toLocaleString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Generates responsive HTML email template for order receipts.
 */
export function buildOrderReceiptHtml({
  customerName = 'Valued Customer',
  order = {},
  receipt = {},
  fulfillment = {},
}) {
  const orderNum = order.orderNumber || order.order_number || 'MSD-000000';
  const receiptNum = receipt.receiptNumber || order.payment?.receiptNumber || `RCP-${orderNum}`;
  const settledAt = formatDate(receipt.settledAt || order.payment?.settledAt || order.createdAt);
  const paymentMethod = receipt.paymentMethod || order.payment?.paymentMethod || 'Visa ending in 4242';

  const items = order.items || order.drinks || [];
  const total = order.totals?.total ?? order.total ?? receipt.amount ?? 0;
  const subtotal = order.totals?.subtotal ?? order.subtotal ?? total;
  const vat = order.totals?.vat ?? order.vat ?? 0;
  const discount = order.totals?.discountAmount ?? order.discount ?? 0;
  const deliveryFee = order.totals?.deliveryFee ?? order.deliveryFee ?? 0;

  const mode = fulfillment.mode || order.fulfillmentMode || 'PICKUP';
  const isPickup = mode === 'PICKUP';

  const rawStoreName = fulfillment.restaurantName;
  const storeName = rawStoreName && !rawStoreName.includes('Toppan')
    ? rawStoreName
    : 'Milky Shakes Studio — Irene Craft Kitchen (Pretoria)';

  const rawStoreAddress = fulfillment.restaurantAddress;
  const storeAddress = rawStoreAddress && !rawStoreAddress.includes('Southdowns')
    ? rawStoreAddress
    : 'Shop 14, The Frosted Spoon Galleria, 77 Sweetwater Lane, Irene, 0157';
  const pickupSlot = fulfillment.pickupTimeSlot || (fulfillment.pickupTime ? formatDate(fulfillment.pickupTime) : 'Ready in 20-30 mins');

  const deliveryAddress = fulfillment.streetAddress
    ? `${fulfillment.streetAddress}${fulfillment.postalCode ? `, ${fulfillment.postalCode}` : ''}`
    : 'Address on file';
  const recipientPhone = fulfillment.recipientPhone || 'Not specified';
  const deliveryNotes = fulfillment.deliveryInstructions || 'None';

  // Item rows HTML
  const itemsHtml = items.map((item, idx) => {
    const slotNum = item.number || idx + 1;
    const flavour = item.flavour || item.flavourName || item.flavour_name_snapshot || 'Artisan Flavour';
    const consistency = item.consistency || item.consistencyName || item.consistency_name_snapshot || 'Standard';
    const topping = item.topping || item.toppingName || item.topping_name_snapshot || 'None';
    const cost = item.cost || item.item_total || 0;

    return `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #F0E6DA;">
          <div style="font-weight: 700; color: #26160F; font-size: 14px;">Slot ${slotNum}: ${flavour}</div>
          <div style="font-size: 12px; color: #7A6254; margin-top: 2px;">
            ${consistency} &bull; Topping: ${topping}
          </div>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #F0E6DA; text-align: right; vertical-align: top; font-weight: 700; color: #26160F; font-size: 14px; white-space: nowrap;">
          ${formatCurrency(cost)}
        </td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Milky Shakes Drinks — Order Confirmed #${orderNum}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF6F0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #26160F; line-height: 1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF6F0; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Container Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #EADBCC; overflow: hidden; box-shadow: 0 4px 20px rgba(46, 26, 17, 0.06);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #2E1A11 0%, #3D2216 100%); padding: 32px 28px; text-align: center;">
              <div style="font-family: 'Georgia', serif; font-size: 38px; font-weight: bold; color: #FFFFFF; letter-spacing: -0.5px;">milky</div>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #D8B89E; margin-top: 4px; font-weight: 600;">
                Artisan Milkshake Studio
              </div>
              <div style="display: inline-block; background-color: #15803D; color: #FFFFFF; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px; border-radius: 9999px; margin-top: 16px;">
                Payment Approved &bull; Order Confirmed
              </div>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 28px;">
              <p style="font-size: 16px; margin: 0 0 16px; color: #26160F;">
                Hi <strong>${customerName}</strong>,
              </p>
              <p style="font-size: 14px; margin: 0 0 24px; color: #5C4537; line-height: 1.6;">
                Thank you for your order! Your handcrafted milkshakes are confirmed and queued for preparation. Below is your official tax invoice and order summary.
              </p>

              <!-- Tax Invoice Reference Block -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF6F0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; border: 1px solid #F0E6DA;">
                <tr>
                  <td style="font-size: 12px; color: #7A6254; padding: 4px 0;"><strong>Order Number:</strong></td>
                  <td style="font-size: 13px; font-weight: 700; color: #26160F; text-align: right; padding: 4px 0;">#${orderNum}</td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: #7A6254; padding: 4px 0;"><strong>Tax Invoice Ref:</strong></td>
                  <td style="font-size: 13px; font-weight: 700; color: #26160F; text-align: right; padding: 4px 0;">${receiptNum}</td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: #7A6254; padding: 4px 0;"><strong>Date & Time:</strong></td>
                  <td style="font-size: 12px; color: #26160F; text-align: right; padding: 4px 0;">${settledAt}</td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: #7A6254; padding: 4px 0;"><strong>Payment Method:</strong></td>
                  <td style="font-size: 12px; color: #26160F; text-align: right; padding: 4px 0;">${paymentMethod}</td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: #7A6254; padding: 4px 0;"><strong>Auth Status:</strong></td>
                  <td style="font-size: 12px; font-weight: 700; color: #15803D; text-align: right; padding: 4px 0;">SETTLED</td>
                </tr>
              </table>

              <!-- Fulfillment Details -->
              <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #BA724C; margin-bottom: 8px;">
                Fulfillment Details
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFFDF9; border: 1px solid #F0E6DA; border-radius: 12px; padding: 14px 18px; margin-bottom: 24px;">
                ${isPickup ? `
                  <tr>
                    <td style="font-size: 12px; color: #7A6254; padding: 4px 0;"><strong>Mode:</strong></td>
                    <td style="font-size: 12px; font-weight: 600; color: #26160F; text-align: right; padding: 4px 0;">Store Pickup (Counter)</td>
                  </tr>
                  <tr>
                    <td style="font-size: 12px; color: #7A6254; padding: 4px 0;"><strong>Store Location:</strong></td>
                    <td style="font-size: 12px; color: #26160F; text-align: right; padding: 4px 0;">${storeName}</td>
                  </tr>
                  <tr>
                    <td style="font-size: 12px; color: #7A6254; padding: 4px 0;"><strong>Address:</strong></td>
                    <td style="font-size: 12px; color: #5C4537; text-align: right; padding: 4px 0;">${storeAddress}</td>
                  </tr>
                  <tr>
                    <td style="font-size: 12px; color: #7A6254; padding: 4px 0;"><strong>Pickup Slot:</strong></td>
                    <td style="font-size: 12px; font-weight: 700; color: #BA724C; text-align: right; padding: 4px 0;">${pickupSlot}</td>
                  </tr>
                ` : `
                  <tr>
                    <td style="font-size: 12px; color: #7A6254; padding: 4px 0;"><strong>Mode:</strong></td>
                    <td style="font-size: 12px; font-weight: 600; color: #26160F; text-align: right; padding: 4px 0;">Cold-Lock Courier Delivery</td>
                  </tr>
                  <tr>
                    <td style="font-size: 12px; color: #7A6254; padding: 4px 0;"><strong>Delivery Address:</strong></td>
                    <td style="font-size: 12px; color: #26160F; text-align: right; padding: 4px 0;">${deliveryAddress}</td>
                  </tr>
                  <tr>
                    <td style="font-size: 12px; color: #7A6254; padding: 4px 0;"><strong>Recipient Contact:</strong></td>
                    <td style="font-size: 12px; color: #26160F; text-align: right; padding: 4px 0;">${recipientPhone}</td>
                  </tr>
                  ${deliveryNotes !== 'None' ? `
                    <tr>
                      <td style="font-size: 12px; color: #7A6254; padding: 4px 0;"><strong>Courier Instructions:</strong></td>
                      <td style="font-size: 12px; color: #5C4537; text-align: right; padding: 4px 0;">${deliveryNotes}</td>
                    </tr>
                  ` : ''}
                `}
              </table>

              <!-- Line Items -->
              <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #BA724C; margin-bottom: 8px;">
                Your Artisan Pack (${items.length} ${items.length === 1 ? 'Shake' : 'Shakes'})
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                ${itemsHtml}
              </table>

              <!-- Totals Breakdown -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF6F0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                <tr>
                  <td style="font-size: 13px; color: #5C4537; padding: 4px 0;">Subtotal</td>
                  <td style="font-size: 13px; color: #26160F; text-align: right; padding: 4px 0;">${formatCurrency(subtotal)}</td>
                </tr>
                ${discount > 0 ? `
                  <tr>
                    <td style="font-size: 13px; color: #15803D; padding: 4px 0;">Volume Discount</td>
                    <td style="font-size: 13px; font-weight: 700; color: #15803D; text-align: right; padding: 4px 0;">-${formatCurrency(discount)}</td>
                  </tr>
                ` : ''}
                <tr>
                  <td style="font-size: 13px; color: #5C4537; padding: 4px 0;">VAT (15% Included)</td>
                  <td style="font-size: 13px; color: #26160F; text-align: right; padding: 4px 0;">${formatCurrency(vat)}</td>
                </tr>
                <tr>
                  <td style="font-size: 13px; color: #5C4537; padding: 4px 0;">Fulfillment</td>
                  <td style="font-size: 13px; color: #26160F; text-align: right; padding: 4px 0;">${deliveryFee > 0 ? formatCurrency(deliveryFee) : 'FREE'}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top: 8px;"><div style="border-top: 1.5px solid #26160F;"></div></td>
                </tr>
                <tr>
                  <td style="font-size: 16px; font-weight: 800; color: #26160F; padding-top: 8px;">TOTAL PAID</td>
                  <td style="font-size: 18px; font-weight: 800; color: #26160F; text-align: right; padding-top: 8px;">${formatCurrency(total)}</td>
                </tr>
              </table>

              <!-- Cold-Lock Guarantee -->
              <div style="background-color: #F5EFEB; border-left: 4px solid #BA724C; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <div style="font-size: 12px; font-weight: 700; color: #2E1A11; text-transform: uppercase; letter-spacing: 0.5px;">
                  Sub-Zero Cold-Lock Guarantee
                </div>
                <div style="font-size: 12px; color: #6B5548; margin-top: 3px; line-height: 1.5;">
                  Your milkshakes are chilled in our sub-zero cryogenic chamber guaranteed frosty for 60 minutes.
                </div>
              </div>

              <p style="font-size: 13px; color: #7A6254; margin: 0; line-height: 1.6; text-align: center;">
                Need assistance? Feel free to reply directly to this email or contact our studio.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F5EFEB; padding: 20px 28px; text-align: center; border-top: 1px solid #EADBCC;">
              <div style="font-size: 11px; font-weight: 600; color: #26160F;">Milky Shakes Drinks (Pty) Ltd.</div>
              <div style="font-size: 10.5px; color: #7A6254; margin-top: 3px;">
                Milky Shakes Studio &bull; Shop 14, The Frosted Spoon Galleria, 77 Sweetwater Lane, Irene, Pretoria
              </div>
              <div style="font-size: 10px; color: #9C8577; margin-top: 6px;">
                This email confirms your payment and serves as your official Tax Invoice.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Builds plain-text fallback receipt for standard text-only clients
 */
export function buildOrderReceiptText({
  customerName = 'Valued Customer',
  order = {},
  receipt = {},
  fulfillment = {},
}) {
  const orderNum = order.orderNumber || order.order_number || 'MSD-000000';
  const receiptNum = receipt.receiptNumber || order.payment?.receiptNumber || `RCP-${orderNum}`;
  const settledAt = formatDate(receipt.settledAt || order.payment?.settledAt || order.createdAt);
  const total = order.totals?.total ?? order.total ?? receipt.amount ?? 0;
  const subtotal = order.totals?.subtotal ?? order.subtotal ?? total;
  const vat = order.totals?.vat ?? order.vat ?? 0;
  const discount = order.totals?.discountAmount ?? order.discount ?? 0;
  const deliveryFee = order.totals?.deliveryFee ?? order.deliveryFee ?? 0;
  const items = order.items || order.drinks || [];

  const lines = [
    '====================================================',
    'MILKY SHAKES DRINKS — TAX INVOICE & ORDER RECEIPT',
    '====================================================',
    `Hi ${customerName},`,
    '',
    `Thank you for your order! Your payment has been received and verified.`,
    '',
    `Order Number: #${orderNum}`,
    `Tax Invoice Ref: ${receiptNum}`,
    `Date & Time: ${settledAt}`,
    `Payment Status: PAID & SETTLED`,
    '',
    'ITEMS:',
    ...items.map((it, idx) => {
      const slot = it.number || idx + 1;
      const f = it.flavour || it.flavourName || it.flavour_name_snapshot || 'Flavour';
      const c = it.consistency || it.consistencyName || it.consistency_name_snapshot || 'Standard';
      const t = it.topping || it.toppingName || it.topping_name_snapshot || 'None';
      const cost = formatCurrency(it.cost || it.item_total || 0);
      return `  Slot ${slot}: ${f} (${c}, Topping: ${t}) - ${cost}`;
    }),
    '',
    'FINANCIAL BREAKDOWN:',
    `  Subtotal: ${formatCurrency(subtotal)}`,
    discount > 0 ? `  Volume Discount: -${formatCurrency(discount)}` : null,
    `  VAT (15% Included): ${formatCurrency(vat)}`,
    `  Fulfillment: ${deliveryFee > 0 ? formatCurrency(deliveryFee) : 'FREE'}`,
    `  TOTAL PAID: ${formatCurrency(total)}`,
    '',
    'FULFILLMENT:',
    `  Mode: ${fulfillment.mode || order.fulfillmentMode || 'PICKUP'}`,
    fulfillment.mode === 'DELIVERY'
      ? `  Delivery Address: ${fulfillment.streetAddress || ''}, ${fulfillment.postalCode || ''}`
      : `  Pickup Store: ${fulfillment.restaurantName && !fulfillment.restaurantName.includes('Toppan') ? fulfillment.restaurantName : 'Milky Shakes Studio — Irene Craft Kitchen'}`,
    '',
    'Sub-Zero Cold-Lock Guaranteed for 60 Mins.',
    'Milky Shakes Drinks (Pty) Ltd. | Shop 14, The Frosted Spoon Galleria, 77 Sweetwater Lane, Irene, 0157',
    '====================================================',
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Dispatches an automated confirmation email to the purchaser.
 * Returns { success: boolean, messageId?: string, error?: string, skipped?: boolean }
 */
export async function sendOrderConfirmationEmail({
  to,
  customerName = 'Valued Customer',
  order = {},
  receipt = {},
  fulfillment = {},
}) {
  const recipient = to || order.customerEmail || order.patronEmail;
  if (!recipient) {
    return {
      success: false,
      skipped: true,
      error: 'Recipient email address not provided',
    };
  }

  const transporter = createTransporter();
  if (!transporter) {
    console.warn('[EmailService] SMTP credentials not configured. Skipping email dispatch.');
    return {
      success: false,
      skipped: true,
      error: 'SMTP credentials not configured in environment',
    };
  }

  const orderNum = order.orderNumber || order.order_number || 'MSD-000000';
  const from = process.env.EMAIL_FROM || `Lebogang Masia <${process.env.SMTP_USER}>`;

  const html = buildOrderReceiptHtml({ customerName, order, receipt, fulfillment });
  const text = buildOrderReceiptText({ customerName, order, receipt, fulfillment });

  try {
    const info = await transporter.sendMail({
      from,
      to: recipient,
      subject: `Milky Shakes Drinks — Order Confirmed & Receipt #${orderNum}`,
      text,
      html,
    });

    console.log(`[EmailService] Receipt email sent successfully to ${recipient} (Message ID: ${info.messageId})`);
    return {
      success: true,
      messageId: info.messageId,
      to: recipient,
    };
  } catch (err) {
    console.error(`[EmailService] Failed to send receipt email to ${recipient}:`, err);
    return {
      success: false,
      error: err.message || 'Failed to dispatch email',
    };
  }
}
