import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import express from 'express';
import type { Express } from 'express';
import { getEnv } from '../../config/env.js';

export function applySecurity(app: Express): void {
  const env = getEnv();

  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const allowedOrigins = new Set(
    [env.FRONTEND_URL, env.APP_URL, env.BACKEND_URL].filter(Boolean),
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.has(origin)) return callback(null, true);
        return callback(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-csrf-token', 'idempotency-key'],
      exposedHeaders: ['x-request-id'],
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
}