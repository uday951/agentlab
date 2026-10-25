import type { IStorageStore } from './storage.ts';
import { MongoStore } from './mongoStore.ts';
import mongoose from 'mongoose';

export async function createStorageStore(): Promise<IStorageStore> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    const errorMsg =
      'MONGODB_URI is not set in environment. MongoDB connection is required for persistent operations. Mock fallback is disabled per strict production guidelines.';
    console.error(`⚠️ [Storage] Configuration Error: ${errorMsg}`);
    return new MongoStore(false, errorMsg);
  }

  try {
    console.log(`🔌 [Storage] Attempting MongoDB connection to ${mongoUri.replace(/:([^:@]+)@/, ':****@')}...`);

    // Configure connection settings
    mongoose.set('strictQuery', true);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    console.log('✅ [Storage] Successfully connected to MongoDB database');
    const store = new MongoStore(true);

    // Register connection state listeners
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ [Storage] MongoDB disconnected');
      store.setConnectionState(false, 'MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 [Storage] MongoDB reconnected');
      store.setConnectionState(true, null);
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ [Storage] MongoDB connection error:', err.message);
      store.setConnectionState(false, err.message);
    });

    // Seed default baseline data if collections are empty
    await store.seedDefaultDataIfNeeded();

    return store;
  } catch (err: any) {
    const errorMsg = `MongoDB connection failed: ${err.message}. Ensure MongoDB is running and MONGODB_URI is correct.`;
    console.error(`❌ [Storage] ${errorMsg}`);
    return new MongoStore(false, errorMsg);
  }
}
