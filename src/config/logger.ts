import pino from 'pino';
import { getEnv, isProd } from './env.js';

const env = getEnv();

const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'password',
  'passwordHash',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.refreshToken',
  '*.accessToken',
  '*.apiKey',
  '*.api_key',
  '*.mpesaPasskey',
  '*.MPESA_PASSKEY',
  '*.consumerSecret',
  '*.consumerKey',
  'body.password',
  'body.newPassword',
  'body.currentPassword',
  'body.token',
  'body.refreshToken',
];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: { paths: redactPaths, censor: '[REDACTED]' },
  base: { service: 'mavunoiq-api', env: env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: isProd()
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
      },
});

export type Logger = typeof logger;