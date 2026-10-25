import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalRAGPipeline } from '../server/sim/rag.ts';
import { defaultShopSphereWorld } from '../server/storage/seedData.ts';

test('LocalRAGPipeline: chunks document into discrete section passages', () => {
  const rag = new LocalRAGPipeline();
  const sampleDoc = defaultShopSphereWorld.knowledgeDocuments[0]; // Policy #24: Standard Return Policy
  const chunks = rag.chunkDocument(sampleDoc);

  assert.ok(chunks.length >= 2, 'Document should be segmented into at least 2 passages');
  assert.ok(chunks[0].chunkId.includes(sampleDoc.id));
  assert.ok(chunks[0].tokenCount > 0);
  assert.ok(chunks[0].section.length > 0);
});

test('LocalRAGPipeline: retrieves matching passage with score and citation', async () => {
  const rag = new LocalRAGPipeline(defaultShopSphereWorld.knowledgeDocuments);
  const results = await rag.retrieve('What is the return window for electronics?', { topK: 2 });

  assert.ok(results.length > 0);
  assert.ok(results[0].score > 0);
  assert.ok(results[0].documentTitle.includes('Policy'));
  assert.ok(results[0].citation.includes('Source:'));
  assert.match(results[0].text, /30 days|window|return|refund|electronics/i);
});

test('LocalRAGPipeline: returns empty array for empty or stop-word only query', async () => {
  const rag = new LocalRAGPipeline(defaultShopSphereWorld.knowledgeDocuments);
  const results = await rag.retrieve('the and or is in', { topK: 3 });
  assert.equal(results.length, 0);
});
