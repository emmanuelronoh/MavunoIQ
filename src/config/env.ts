import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const booleanFromString = z
  .union([z.literal('true'), z.literal('false'), z.boolean()])
  .transform((v) => (typeof v === 'boolean' ? v : v === 'true'));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  API_PREFIX: z.string().default('/api/v1'),
  APP_URL: z.string().url().default('http://localhost:5173'),
  BACKEND_URL: z.string().url().default('http://localhost:5000'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_DOMAIN: z.string().default('localhost'),
  COOKIE_SECURE: booleanFromString.default(false),

  AI_PROVIDER: z.string().optional().default(''),
  AI_API_KEY: z.string().optional().default(''),
  AI_MODEL: z.string().optional().default(''),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),

  WEATHER_PROVIDER: z.string().optional().default(''),
  WEATHER_API_KEY: z.string().optional().default(''),
  WEATHER_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  WEATHER_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(1800),

  MARKET_DATA_PROVIDER: z.string().optional().default(''),
  MARKET_DATA_API_KEY: z.string().optional().default(''),

  PAYMENT_PROVIDER: z.string().optional().default(''),
  MPESA_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),
  MPESA_CONSUMER_KEY: z.string().optional().default(''),
  MPESA_CONSUMER_SECRET: z.string().optional().default(''),
  MPESA_SHORTCODE: z.string().optional().default(''),
  MPESA_PASSKEY: z.string().optional().default(''),
  MPESA_CALLBACK_URL: z.string().optional().default(''),

  EMAIL_PROVIDER: z.string().optional().default(''),
  EMAIL_API_KEY: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('noreply@mavunoiq.local'),

  STORAGE_PROVIDER: z.string().optional().default('local'),
  STORAGE_BUCKET: z.string().optional().default('mavunoiq-uploads'),
  STORAGE_ACCESS_KEY: z.string().optional().default(''),
  STORAGE_SECRET_KEY: z.string().optional().default(''),
  STORAGE_ENDPOINT: z.string().optional().default(''),
  STORAGE_REGION: z.string().optional().default('us-east-1'),
  STORAGE_LOCAL_DIR: z.string().optional().default('./uploads'),

  REDIS_URL: z.string().optional().default(''),
  SENTRY_DSN: z.string().optional().default(''),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

  BOOTSTRAP_ADMIN_EMAIL: z.string().optional().default(''),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().optional().default(''),
  BOOTSTRAP_ADMIN_NAME: z.string().optional().default(''),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    // eslint-disable-next-line no-console
    console.error(`\n[ENV] Invalid environment configuration:\n${issues}\n`);
    throw new Error('Invalid environment configuration');
  }
  cached = parsed.data;
  return cached;
}

export const isProd = () => getEnv().NODE_ENV === 'production';
export const isTest = () => getEnv().NODE_ENV === 'test';
export const isDev = () => getEnv().NODE_ENV === 'development';