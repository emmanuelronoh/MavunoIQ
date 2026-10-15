import { beforeAll, afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongo: MongoMemoryServer;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:0/mavunoiq_test';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-0000000000000000000000000000';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-000000000000000000000000000';
  process.env.AI_PROVIDER = 'demo';
  process.env.WEATHER_PROVIDER = 'demo';
  process.env.PAYMENT_PROVIDER = 'demo';
  process.env.EMAIL_PROVIDER = 'demo';
  process.env.STORAGE_PROVIDER = 'demo';

  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  await mongoose.connect(process.env.MONGODB_URI);
});

afterEach(async () => {
  if (mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});