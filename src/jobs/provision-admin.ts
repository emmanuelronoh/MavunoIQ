/* eslint-disable no-console */
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { getEnv } from '../config/env.js';
import { User } from '../modules/users/user.model.js';
import { hashPassword } from '../modules/auth/auth.service.js';
import { logger } from '../config/logger.js';

/**
 * Secure admin provisioning. This is the ONLY supported way to create an ADMIN account.
 * Usage:
 *   BOOTSTRAP_ADMIN_EMAIL=... BOOTSTRAP_ADMIN_PASSWORD=... BOOTSTRAP_ADMIN_NAME="Full Name" \
 *     npm run provision-admin
 * The password is never logged.
 */
async function run() {
  const env = getEnv();
  if (!env.BOOTSTRAP_ADMIN_EMAIL || !env.BOOTSTRAP_ADMIN_PASSWORD) {
    throw new Error('BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required');
  }
  if (env.BOOTSTRAP_ADMIN_PASSWORD.length < 12) {
    throw new Error('Admin password must be at least 12 characters');
  }

  await connectDatabase();

  const email = env.BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
  let user = await User.findOne({ email });
  if (user) {
    user.role = 'ADMIN';
    user.isActive = true;
    user.isEmailVerified = true;
    if (env.BOOTSTRAP_ADMIN_PASSWORD) {
      user.passwordHash = await hashPassword(env.BOOTSTRAP_ADMIN_PASSWORD);
    }
    await user.save();
    logger.info({ email }, 'Existing user promoted to ADMIN');
  } else {
    const [firstName, ...rest] = (env.BOOTSTRAP_ADMIN_NAME || 'MavunoIQ Admin').split(' ');
    user = await User.create({
      email,
      passwordHash: await hashPassword(env.BOOTSTRAP_ADMIN_PASSWORD),
      role: 'ADMIN',
      firstName: firstName || 'Admin',
      lastName: rest.join(' ') || 'User',
      isEmailVerified: true,
      isActive: true,
    });
    logger.info({ email }, 'ADMIN account created');
  }

  await disconnectDatabase();
}

run().catch((err) => {
  logger.error({ err }, 'Admin provisioning failed');
  process.exit(1);
});