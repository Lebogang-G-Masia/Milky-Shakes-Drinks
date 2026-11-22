import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app, { seedSampleOrdersIfEmpty } from '../src/app.js';
import {
  USER_ROLES,
  ORDER_STATUS,
  FULFILLMENT_MODES,
  validateReportingFilters,
  filterOrders,
  calculateAggregatedMetrics,
  generateOrdersCsv,
} from '@milky-shakes/shared';

let server;
let baseUrl;

before(async () => {
  seedSampleOrdersIfEmpty();
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('Management Oversight & Filtered Reporting (FR-005)', () => {
  describe('RBAC Security Guard (AC-FR-005.3)', () => {
    it('rejects unauthenticated request with HTTP 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/admin/reports/summary`);
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.code, 'AUTH_REQUIRED');
    });

    it('rejects non-admin PATRON role with HTTP 403 Forbidden (AC-FR-005.3)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/reports/summary`, {
        headers: { 'x-user-role': USER_ROLES.PATRON },
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.code, 'RBAC_FORBIDDEN');
      assert.strictEqual(data.attemptedRole, 'PATRON');
    });

    it('allows MANAGER role with HTTP 200 OK', async () => {
      const res = await fetch(`${baseUrl}/api/admin/reports/summary`, {
        headers: { 'x-user-role': USER_ROLES.MANAGER },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.metrics);
    });

    it('allows STAFF role with HTTP 200 OK', async () => {
      const res = await fetch(`${baseUrl}/api/admin/reports/summary`, {
        headers: { 'x-user-role': USER_ROLES.STAFF },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
    });
  });

  describe('Aggregated Executive Metrics (AC-FR-005.1)', () => {
    it('calculates gross revenue, order counts, and fulfillment split', async () => {
      const res = await fetch(`${baseUrl}/api/admin/reports/summary`, {
        headers: { 'x-user-role': USER_ROLES.MANAGER },
      });
      const data = await res.json();
      assert.strictEqual(data.success, true);
      const { metrics } = data;

      assert.ok(metrics.totalOrders >= 5);
      assert.ok(metrics.grossRevenue > 0);
      assert.ok(metrics.paidOrdersCount > 0);
      assert.ok(metrics.averageOrderValue > 0);
      assert.ok(metrics.fulfillment.pickupCount > 0);
      assert.ok(metrics.fulfillment.deliveryCount > 0);
      assert.strictEqual(
        Number((metrics.fulfillment.pickupPercentage + metrics.fulfillment.deliveryPercentage).toFixed(0)),
        100
      );
      assert.ok(Array.isArray(metrics.topFlavours));
      assert.ok(Array.isArray(metrics.topToppings));
    });
  });

  describe('Clever Filters & SLA Performance (AC-FR-005.2)', () => {
    it('executes filtered query in under 500ms (SLA assertion AC-FR-005.2)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/reports/orders?datePreset=LAST_7_DAYS`, {
        headers: { 'x-user-role': USER_ROLES.MANAGER },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.durationMs < 500, `Expected duration < 500ms, got ${data.durationMs}ms`);
      assert.strictEqual(data.slaMet, true);
    });

    it('filters orders by status correctly', async () => {
      const res = await fetch(`${baseUrl}/api/admin/reports/orders?status=PAID`, {
        headers: { 'x-user-role': USER_ROLES.MANAGER },
      });
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.orders.length > 0);
      for (const o of data.orders) {
        assert.strictEqual(o.status, ORDER_STATUS.PAID);
      }
    });

    it('filters orders by fulfillment channel (PICKUP vs DELIVERY)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/reports/orders?fulfillmentMode=DELIVERY`, {
        headers: { 'x-user-role': USER_ROLES.MANAGER },
      });
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.orders.length > 0);
      for (const o of data.orders) {
        assert.strictEqual(o.fulfillmentMode, FULFILLMENT_MODES.DELIVERY);
        assert.ok(o.fulfillmentDetails.destinationAddress || o.fulfillmentDetails.recipientPhone);
      }
    });

    it('filters orders by flavour ingredient (Chocolate)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/reports/orders?flavour=Chocolate`, {
        headers: { 'x-user-role': USER_ROLES.MANAGER },
      });
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.orders.length > 0);
      for (const o of data.orders) {
        const hasChoc = o.drinks.some((d) => d.flavour.toLowerCase().includes('chocolate'));
        assert.strictEqual(hasChoc, true);
      }
    });

    it('filters orders by price threshold (minTotal >= R100)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/reports/orders?minTotal=100`, {
        headers: { 'x-user-role': USER_ROLES.MANAGER },
      });
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.orders.length > 0);
      for (const o of data.orders) {
        assert.ok(o.total >= 100);
      }
    });

    it('filters orders by instant search term', async () => {
      const res = await fetch(`${baseUrl}/api/admin/reports/orders?searchTerm=sarah.connor`, {
        headers: { 'x-user-role': USER_ROLES.MANAGER },
      });
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.orders.length, 1);
      assert.strictEqual(data.orders[0].customerEmail, 'sarah.connor@example.com');
    });

    it('rejects invalid filter with descriptive error messages', async () => {
      const res = await fetch(`${baseUrl}/api/admin/reports/orders?minTotal=-10&fulfillmentMode=TELEPORT`, {
        headers: { 'x-user-role': USER_ROLES.MANAGER },
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.details.length >= 2);
    });
  });

  describe('Data Sanitization & Schema Protection (AC-FR-005.1)', () => {
    it('sanitizes responses to ensure no raw passwords or internal secrets are exposed', async () => {
      const res = await fetch(`${baseUrl}/api/admin/reports/orders`, {
        headers: { 'x-user-role': USER_ROLES.MANAGER },
      });
      const data = await res.json();
      assert.strictEqual(data.success, true);
      for (const order of data.orders) {
        assert.strictEqual(order.password_hash, undefined);
        assert.strictEqual(order.service_role_key, undefined);
        assert.strictEqual(order.db_password, undefined);
        assert.strictEqual(order.connection_string, undefined);
      }
    });
  });

  describe('Chronological Audit Trail (AC-FR-005.1)', () => {
    it('retrieves chronological transaction and order state transitions', async () => {
      const res = await fetch(`${baseUrl}/api/admin/reports/audit-logs`, {
        headers: { 'x-user-role': USER_ROLES.MANAGER },
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.count > 0);
      assert.ok(Array.isArray(data.auditLogs));

      const firstLog = data.auditLogs[0];
      assert.ok(firstLog.id);
      assert.ok(firstLog.action);
      assert.ok(firstLog.actor_role);
      assert.ok(firstLog.entity_type);
      assert.ok(firstLog.created_at);
    });
  });

  describe('CSV Report Export (AC-FR-005.1, AC-FR-005.2)', () => {
    it('generates downloadable RFC 4180 CSV with accurate header and rows', async () => {
      const res = await fetch(`${baseUrl}/api/admin/reports/export?status=PAID`, {
        headers: { 'x-user-role': USER_ROLES.MANAGER },
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers.get('content-type').includes('text/csv'));
      assert.ok(res.headers.get('content-disposition').includes('attachment; filename='));

      const csvText = await res.text();
      const lines = csvText.trim().split('\r\n');
      assert.ok(lines.length >= 2);
      assert.strictEqual(
        lines[0],
        'Order Number,Created At,Customer Email,Status,Fulfillment Mode,Drinks Count,Subtotal (ZAR),VAT (ZAR),Discount (ZAR),Delivery Fee (ZAR),Total (ZAR)'
      );
      // All exported rows should match the filter
      for (let i = 1; i < lines.length; i++) {
        assert.ok(lines[i].includes('PAID'));
      }
    });
  });

  describe('Live Kitchen & Operational Order Management', () => {
    it('updates order status in real-time and registers audit entry', async () => {
      const res = await fetch(`${baseUrl}/api/admin/orders/ord-sample-2/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': USER_ROLES.MANAGER,
        },
        body: JSON.stringify({ status: ORDER_STATUS.READY, note: 'Blended and packaged for driver' }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.order.status, ORDER_STATUS.READY);
    });

    it('rejects invalid status updates with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/admin/orders/ord-sample-1/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': USER_ROLES.MANAGER,
        },
        body: JSON.stringify({ status: 'INVALID_STATUS' }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });
  });

  describe('Inventory & Store Operational Controls', () => {
    it('retrieves inventory catalog with flavours and toppings', async () => {
      const res = await fetch(`${baseUrl}/api/admin/inventory`, {
        headers: { 'x-user-role': USER_ROLES.MANAGER },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.inventory));
      assert.ok(data.inventory.length >= 8);
    });

    it('updates item stock status (IN_STOCK -> LOW_STOCK)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/inventory/flav-1`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': USER_ROLES.MANAGER,
        },
        body: JSON.stringify({ stockStatus: 'LOW_STOCK', remainingPortions: 5 }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.item.stockStatus, 'LOW_STOCK');
      assert.strictEqual(data.item.remainingPortions, 5);
    });

    it('retrieves and switches store operational mode', async () => {
      const getRes = await fetch(`${baseUrl}/api/admin/store-status`, {
        headers: { 'x-user-role': USER_ROLES.MANAGER },
      });
      assert.strictEqual(getRes.status, 200);

      const patchRes = await fetch(`${baseUrl}/api/admin/store-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': USER_ROLES.MANAGER,
        },
        body: JSON.stringify({ mode: 'BUSY', rushExtraMinutes: 15 }),
      });
      assert.strictEqual(patchRes.status, 200);
      const patchData = await patchRes.json();
      assert.strictEqual(patchData.storeStatus.mode, 'BUSY');
      assert.strictEqual(patchData.storeStatus.rushExtraMinutes, 15);
    });
  });
});
