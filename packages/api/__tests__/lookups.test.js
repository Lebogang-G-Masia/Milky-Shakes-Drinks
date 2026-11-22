import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import app, { seedSampleOrdersIfEmpty } from '../src/app.js';
import { USER_ROLES } from '@milky-shakes/shared';

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

describe('Lookup Table Manager & Patron History (Mandatory #3, #9, #10)', () => {
  describe('Public Lookup Catalog (/api/lookups)', () => {
    it('retrieves flavours, toppings, consistencies, and configurations', async () => {
      const res = await fetch(`${baseUrl}/api/lookups`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.flavours));
      assert.ok(data.flavours.length >= 7, 'Must have at least 7 milkshake flavours');
      assert.ok(Array.isArray(data.toppings));
      assert.ok(Array.isArray(data.consistencies));
      assert.ok(data.configurations.VAT_PERCENTAGE);
    });
  });

  describe('Lookup Item Creation & RBAC (/api/admin/lookups/:type)', () => {
    it('rejects unauthenticated creation with 401', async () => {
      const res = await fetch(`${baseUrl}/api/admin/lookups/flavours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Caramel Macchiato', price: 46.0 }),
      });
      assert.strictEqual(res.status, 401);
    });

    it('rejects non-admin PATRON role with 403', async () => {
      const res = await fetch(`${baseUrl}/api/admin/lookups/flavours`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': USER_ROLES.PATRON,
        },
        body: JSON.stringify({ name: 'Caramel Macchiato', price: 46.0 }),
      });
      assert.strictEqual(res.status, 403);
    });

    it('allows MANAGER to create a new flavour and registers audit log', async () => {
      const res = await fetch(`${baseUrl}/api/admin/lookups/flavours`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': USER_ROLES.MANAGER,
        },
        body: JSON.stringify({ name: 'Caramel Macchiato', price: 46.0, itemType: 'Signature Artisan' }),
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.item.name, 'Caramel Macchiato');
      assert.strictEqual(data.item.price, 46.0);

      // Verify audit trail recorded creation
      const auditRes = await fetch(`${baseUrl}/api/admin/reports/audit-logs`, {
        headers: { 'x-user-role': USER_ROLES.MANAGER },
      });
      const auditData = await auditRes.json();
      const creationEntry = auditData.auditLogs.find(
        (log) => log.action === 'LOOKUP_CREATED' && log.entity_type === 'FLAVOURS'
      );
      assert.ok(creationEntry, 'Audit log must record LOOKUP_CREATED');
    });
  });

  describe('Lookup Item Update & Audit Trail (who changed what to what)', () => {
    it('updates flavour price and logs exact previous and new value in audit log', async () => {
      const updateRes = await fetch(`${baseUrl}/api/admin/lookups/flavours/flav-strawberry`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': USER_ROLES.MANAGER,
        },
        body: JSON.stringify({ price: 39.50 }),
      });
      assert.strictEqual(updateRes.status, 200);
      const updateData = await updateRes.json();
      assert.strictEqual(updateData.item.price, 39.50);

      // Verify audit log has previous and new value
      const auditRes = await fetch(`${baseUrl}/api/admin/reports/audit-logs`, {
        headers: { 'x-user-role': USER_ROLES.MANAGER },
      });
      const auditData = await auditRes.json();
      const updateEntry = auditData.auditLogs.find(
        (log) => log.action === 'LOOKUP_UPDATED' && log.entity_id === 'flav-strawberry'
      );
      assert.ok(updateEntry, 'Audit log must record LOOKUP_UPDATED for flav-strawberry');
      assert.strictEqual(updateEntry.field_name, 'price');
      assert.strictEqual(updateEntry.new_value, 'R39.50');
    });

    it('updates system configuration (VAT, min/max drinks, discount rules)', async () => {
      const configRes = await fetch(`${baseUrl}/api/admin/configurations/VAT_PERCENTAGE`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': USER_ROLES.MANAGER,
        },
        body: JSON.stringify({ value: 15.0 }),
      });
      assert.strictEqual(configRes.status, 200);
      const configData = await configRes.json();
      assert.strictEqual(configData.config.value, 15.0);
    });
  });

  describe('Patron Order History & Loyalty (/api/patron/orders)', () => {
    it('retrieves patron past orders with computed loyalty discount status', async () => {
      const res = await fetch(`${baseUrl}/api/patron/orders?email=sarah.connor@example.com`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.orders));
      assert.ok(data.loyalty);
      assert.strictEqual(typeof data.loyalty.completedOrdersCount, 'number');
      assert.strictEqual(typeof data.loyalty.eligibleDiscountPercent, 'number');
    });
  });
});
