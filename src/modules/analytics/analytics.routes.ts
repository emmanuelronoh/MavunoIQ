import { Router } from 'express';
import { authenticate, requireAdmin } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { ok } from '../../common/utils/apiResponse.js';
import { Order } from '../orders/order.model.js';
import { User } from '../users/user.model.js';

export const analyticsRouter = Router();
analyticsRouter.use(authenticate, requireAdmin);

analyticsRouter.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [ordersIn30d, completedIn30d, newUsersIn30d, gmvAgg] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: since } }),
      Order.countDocuments({ status: 'COMPLETED', completedAt: { $gte: since } }),
      User.countDocuments({ createdAt: { $gte: since } }),
      Order.aggregate([
        { $match: { status: 'COMPLETED', completedAt: { $gte: since } } },
        { $group: { _id: null, gmvCents: { $sum: '$totalCents' } } },
      ]),
    ]);
    const gmvCents = gmvAgg[0]?.gmvCents ?? 0;
    return ok(res, {
      window: { from: since.toISOString(), to: new Date().toISOString() },
      ordersIn30d,
      completedIn30d,
      newUsersIn30d,
      gmvKes: gmvCents / 100,
    });
  }),
);