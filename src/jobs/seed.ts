/* eslint-disable no-console */
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { User } from '../modules/users/user.model.js';
import { FarmerProfile } from '../modules/farmers/farmer.model.js';
import { BuyerProfile } from '../modules/buyers/buyer.model.js';
import { Farm } from '../modules/farms/farm.model.js';
import { Category } from '../modules/categories/category.model.js';
import { Product } from '../modules/products/product.model.js';
import { MarketPrice } from '../modules/market-intelligence/marketPrice.model.js';
import { hashPassword } from '../modules/auth/auth.service.js';
import { logger } from '../config/logger.js';

const DEMO_PASSWORD = 'DemoPass123';

async function run() {
  await connectDatabase();
  logger.info('Seeding demo data (all records labelled DEMO)...');

  // Wipe selected collections to make the script idempotent in development
  await Promise.all([
    User.deleteMany({ email: /@demo\.mavunoiq\.local$/ }),
    FarmerProfile.deleteMany({}),
    BuyerProfile.deleteMany({}),
    Farm.deleteMany({}),
    Product.deleteMany({}),
    MarketPrice.deleteMany({ isDemo: true }),
  ]);

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const farmer = await User.create({
    email: 'farmer@demo.mavunoiq.local',
    passwordHash,
    role: 'FARMER',
    firstName: 'Demo',
    lastName: 'Farmer',
    isEmailVerified: true,
    isActive: true,
  });

  const buyer = await User.create({
    email: 'buyer@demo.mavunoiq.local',
    passwordHash,
    role: 'BUYER',
    firstName: 'Demo',
    lastName: 'Buyer',
    isEmailVerified: true,
    isActive: true,
  });

  await FarmerProfile.create({
    user: farmer._id,
    displayName: 'Demo Farmer',
    county: 'Nakuru',
    town: 'Naivasha',
    mainCrops: ['Tomato', 'Maize'],
    farmingMethods: ['irrigated'],
    biography: 'DEMO farmer profile for MavunoIQ.',
  });

  await BuyerProfile.create({
    user: buyer._id,
    displayName: 'Demo Buyer',
    buyerType: 'retailer',
    county: 'Nairobi',
    businessName: 'Demo Retail Ltd',
    businessDescription: 'DEMO buyer profile for MavunoIQ.',
  });

  const farm = await Farm.create({
    farmer: farmer._id,
    name: 'Demo Farm',
    county: 'Nakuru',
    town: 'Naivasha',
    size: 5,
    sizeUnit: 'acres',
    crops: ['Tomato', 'Maize'],
    farmingMethods: ['irrigated'],
  });

  const veg = await Category.findOneAndUpdate(
    { slug: 'vegetables' },
    { name: 'Vegetables', slug: 'vegetables', iconEmoji: '🥬' },
    { upsert: true, new: true },
  );

  await Product.create({
    farmer: farmer._id,
    farm: farm._id,
    name: 'Tomato (DEMO)',
    category: veg._id,
    description: 'Fresh tomatoes — DEMO data for testing.',
    images: [],
    quantityAvailable: 500,
    unit: 'kg',
    priceCents: 8000,
    minimumOrderQuantity: 5,
    qualityGrade: 'A',
    farmingMethod: 'irrigated',
    county: 'Nakuru',
    town: 'Naivasha',
    status: 'PUBLISHED',
  });

  await MarketPrice.create({
    crop: 'Tomato',
    market: 'Nakuru Market',
    county: 'Nakuru',
    priceCents: 8000,
    unit: 'kg',
    observedAt: new Date(),
    source: 'demo-seed',
    isDemo: true,
    quality: 'demo',
    confidence: 0.2,
  });

  logger.info(
    {
      demoFarmer: farmer.email,
      demoBuyer: buyer.email,
      demoPassword: DEMO_PASSWORD,
    },
    'Demo seed complete. Change these credentials before any non-demo use.',
  );

  await disconnectDatabase();
}

run().catch((err) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});