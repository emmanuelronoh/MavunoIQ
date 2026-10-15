import { Router } from 'express';
import { getDatabaseHealth } from '../../config/database.js';
import { getEnv } from '../../config/env.js';
import { ok } from '../../common/utils/apiResponse.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  const env = getEnv();
  const db = getDatabaseHealth();
  const healthy = db.connected;
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    message: healthy ? 'Service healthy' : 'Service degraded',
    data: {
      status: healthy ? 'ok' : 'degraded',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      env: env.NODE_ENV,
      database: db,
      providers: {
        ai: env.AI_PROVIDER || 'disabled',
        weather: env.WEATHER_PROVIDER || 'disabled',
        marketData: env.MARKET_DATA_PROVIDER || 'disabled',
        payments: env.PAYMENT_PROVIDER || 'disabled',
        email: env.EMAIL_PROVIDER || 'disabled',
        storage: env.STORAGE_PROVIDER || 'disabled',
      },
    },
  });
});