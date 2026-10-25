import test from 'node:test';
import assert from 'node:assert/strict';
import { AgentModel, WorldModel, ScenarioModel, KnowledgeDocumentModel } from '../server/models/index.ts';
import { MongoStore } from '../server/storage/mongoStore.ts';
import { DatabaseNotConfiguredError } from '../server/storage/storage.ts';

test('Mongoose AgentModel: validates required fields and default connectionType', () => {
  const agent = new AgentModel({
    id: 'test-agent',
    name: 'Customer Agent',
  });

  const err = agent.validateSync();
  assert.equal(err, undefined, 'Valid agent document should pass validation');
  assert.equal(agent.connectionType, 'builtin');
  assert.equal(agent.status, 'ready');
});

test('Mongoose AgentModel: rejects invalid connectionType enum', () => {
  const agent = new AgentModel({
    id: 'test-agent',
    name: 'Customer Agent',
    connectionType: 'invalid_type' as any,
  });

  const err = agent.validateSync();
  assert.ok(err);
  assert.ok(err.errors['connectionType']);
});

test('Mongoose WorldModel: validates required fields and structures', () => {
  const world = new WorldModel({
    id: 'test-world',
    name: 'Support World',
    industry: 'E-commerce',
  });

  const err = world.validateSync();
  assert.equal(err, undefined);
  assert.equal(world.industry, 'E-commerce');
});

test('MongoStore: throws DatabaseNotConfiguredError when MongoDB is disconnected', async () => {
  const unconfiguredStore = new MongoStore(false, 'MONGODB_URI not configured');

  assert.equal(unconfiguredStore.isConnected(), false);
  assert.equal(unconfiguredStore.getConnectionError(), 'MONGODB_URI not configured');

  await assert.rejects(
    async () => {
      await unconfiguredStore.getAgents();
    },
    (err: any) => {
      assert.ok(err instanceof DatabaseNotConfiguredError || err.name === 'DatabaseNotConfiguredError');
      assert.match(err.message, /MONGODB_URI not configured|MongoDB is not configured/);
      return true;
    }
  );
});
