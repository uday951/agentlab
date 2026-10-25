import type { IStorageStore } from './storage.ts';
import { LocalFileStore } from './localStore.ts';

export async function createStorageStore(): Promise<IStorageStore> {
  const mongoUri = process.env.MONGODB_URI;

  if (mongoUri) {
    try {
      console.log('🔌 [Storage] Attempting MongoDB connection...');
      const mongoose = await import('mongoose');
      await mongoose.default.connect(mongoUri, { serverSelectionTimeoutMS: 2500 });
      console.log('✅ [Storage] Connected to MongoDB database');
    } catch (err: any) {
      console.warn(`⚠️ [Storage] MongoDB connection failed (${err.message}). Falling back to Local Persistence Mode.`);
    }
  }

  console.log('📁 [Storage] Active Mode: Local Development Persistence Store (data persisted in server/data/*.json)');
  console.log('ℹ️ [Storage] Note: Full database CRUD functionality is operational without external database servers.');

  const store = new LocalFileStore();
  await store.seedDefaultDataIfNeeded();
  return store;
}
