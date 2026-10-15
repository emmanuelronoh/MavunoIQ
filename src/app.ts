import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

import { applySecurity } from './common/middleware/security.js';
import { requestId } from './common/middleware/requestId.js';
import { errorHandler, notFoundHandler } from './common/middleware/errorHandler.js';
import { generalLimiter } from './common/middleware/rateLimiter.js';
import { getEnv } from './config/env.js';
import { openapiSpec } from './docs/openapi.js';

import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { farmersRouter } from './modules/farmers/farmers.routes.js';
import { buyersRouter } from './modules/buyers/buyers.routes.js';
import { farmsRouter } from './modules/farms/farms.routes.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { productsRouter } from './modules/products/products.routes.js';
import { marketplaceRouter } from './modules/marketplace/marketplace.routes.js';
import { ordersRouter } from './modules/orders/orders.routes.js';
import { paymentsRouter } from './modules/payments/payments.routes.js';
import { messagingRouter } from './modules/messaging/messaging.routes.js';
import { notificationsRouter } from './modules/notifications/notifications.routes.js';
import { reviewsRouter } from './modules/reviews/reviews.routes.js';
import { favoritesRouter } from './modules/favorites/favorites.routes.js';
import { verificationRouter } from './modules/verification/verification.routes.js';
import { marketIntelligenceRouter } from './modules/market-intelligence/market-intelligence.routes.js';
import { weatherRouter } from './modules/weather/weather.routes.js';
import { aiAdvisorRouter } from './modules/ai-advisor/ai-advisor.routes.js';
import { cropAnalysisRouter } from './modules/crop-analysis/crop-analysis.routes.js';
import { demandForecastingRouter } from './modules/demand-forecasting/demand-forecasting.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { analyticsRouter } from './modules/analytics/analytics.routes.js';

import { healthRouter } from './modules/health/health.routes.js';

export function createApp(): Express {
  const app = express();
  const env = getEnv();

  applySecurity(app);
  app.use(requestId);
  app.use(cookieParser());

  // Health (unversioned)
  app.use('/health', healthRouter);

  // API docs
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

  const api = express.Router();
  api.use(generalLimiter);

  api.use('/health', healthRouter);
  api.use('/auth', authRouter);
  api.use('/users', usersRouter);
  api.use('/farmers', farmersRouter);
  api.use('/buyers', buyersRouter);
  api.use('/farms', farmsRouter);
  api.use('/categories', categoriesRouter);
  api.use('/products', productsRouter);
  api.use('/marketplace', marketplaceRouter);
  api.use('/orders', ordersRouter);
  api.use('/payments', paymentsRouter);
  api.use('/messaging', messagingRouter);
  api.use('/notifications', notificationsRouter);
  api.use('/reviews', reviewsRouter);
  api.use('/favorites', favoritesRouter);
  api.use('/verification', verificationRouter);
  api.use('/market-intelligence', marketIntelligenceRouter);
  api.use('/weather', weatherRouter);
  api.use('/ai-advisor', aiAdvisorRouter);
  api.use('/crop-analysis', cropAnalysisRouter);
  api.use('/demand', demandForecastingRouter);
  api.use('/admin', adminRouter);
  api.use('/analytics', analyticsRouter);

  app.use(env.API_PREFIX, api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}