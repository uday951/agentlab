import test from 'node:test';
import assert from 'node:assert/strict';
import { ShopSphereToolRegistry } from '../server/sim/tools.ts';
import { defaultShopSphereWorld } from '../server/storage/seedData.ts';

test('ShopSphereToolRegistry: lookup_order retrieves order record', async () => {
  const tools = new ShopSphereToolRegistry(defaultShopSphereWorld.initialData.orders);
  const result = await tools.executeTool('lookup_order', { orderId: 'ORD-9821' });

  assert.equal(result.success, true);
  assert.equal(result.data.orderId, 'ORD-9821');
  assert.equal(result.data.customerEmail, 'sarah.j@example.com');
  assert.equal(result.data.totalAmount, 249.99);
});

test('ShopSphereToolRegistry: check_refund_eligibility evaluates 30-day window', async () => {
  const tools = new ShopSphereToolRegistry(defaultShopSphereWorld.initialData.orders);

  // Eligible within 12 days (ORD-9821)
  const eligible = await tools.executeTool('check_refund_eligibility', { orderId: 'ORD-9821' });
  assert.equal(eligible.success, true);
  assert.equal(eligible.data.eligible, true);

  // Ineligible after 45 days (ORD-5412)
  const ineligible = await tools.executeTool('check_refund_eligibility', { orderId: 'ORD-5412' });
  assert.equal(ineligible.success, true);
  assert.equal(ineligible.data.eligible, false);
  assert.match(ineligible.data.reason, /30 days/i);
});

test('ShopSphereToolRegistry: handles injected fault error (HTTP 503)', async () => {
  const tools = new ShopSphereToolRegistry(defaultShopSphereWorld.initialData.orders);

  // Inject failure on process_refund
  tools.injectFailure('process_refund', {
    failureType: 'http_500',
    failureMessage: 'Payment Gateway HTTP 503 Service Unavailable: Downstream payment processor connection timed out.',
  });

  const failedResult = await tools.executeTool('process_refund', {
    orderId: 'ORD-9821',
    amount: 249.99,
    reason: 'Defective product',
  });

  assert.equal(failedResult.success, false);
  assert.match(failedResult.error, /HTTP 503 Service Unavailable/);

  // Clear failure
  tools.clearInjectedFailures();
  const successResult = await tools.executeTool('process_refund', {
    orderId: 'ORD-9821',
    amount: 249.99,
    reason: 'Customer return',
  });
  assert.equal(successResult.success, true);
  assert.ok(successResult.data.transactionId);
});

test('ShopSphereToolRegistry: escalate_to_manager generates priority tracking ticket', async () => {
  const tools = new ShopSphereToolRegistry(defaultShopSphereWorld.initialData.orders);
  const result = await tools.executeTool('escalate_to_manager', {
    orderId: 'ORD-9821',
    reason: 'Payment processor timeout during refund attempt',
    priority: 'high',
  });

  assert.equal(result.success, true);
  assert.ok(result.data.ticketId.startsWith('ESC-'));
  assert.equal(result.data.priority, 'high');
  assert.equal(result.data.assignedQueue, 'Tier-2 Customer Operations');
});
