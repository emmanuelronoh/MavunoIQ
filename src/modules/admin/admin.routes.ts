import { Router } from 'express';
import { authenticate, requireAdmin } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { buildPagination, ok, parsePagination } from '../../common/utils/apiResponse.js';
import { User } from '../users/user.model.js';
import { Product } from '../products/product.model.js';
import { Order } from '../orders/order.model.js';
import { VerificationRequest } from '../verification/verificationRequest.model.js';
import { AuditLog } from './auditLog.model.js';
import { z } from 'zod';
import { validate } from '../../common/middleware/validate.js';
import { AppError } from '../../common/errors/AppError.js';

export const adminRouter = Router();
adminRouter.use(authenticate, requireAdmin);

adminRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [users, farmers, buyers, products, orders, pendingVerifications] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'FARMER' }),
      User.countDocuments({ role: 'BUYER' }),
      Product.countDocuments({ status: 'PUBLISHED' }),
      Order.countDocuments(),
      VerificationRequest.countDocuments({ status: 'PENDING' }),
    ]);
    return ok(res, {
      users, farmers, buyers, products, orders, pendingVerifications,
      timestamp: new Date().toISOString(),
    });
  }),
);

adminRouter.get(
  '/users',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const filter: Record<string, unknown> = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.q) filter.email = new RegExp(String(req.query.q), 'i');
    const [items, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);
    return ok(res, items, 'Users retrieved', 200, buildPagination(page, limit, total));
  }),
);

adminRouter.post(
  '/users/:id/deactivate',
  validate(z.object({ reason: z.string().max(500).optional() })),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw AppError.notFound('User not found');
    user.isActive = false;
    user.deactivatedAt = new Date();
    await user.save();
    await AuditLog.create({
      actor: req.user!.id,
      action: 'user.deactivate',
      targetType: 'User',
      targetId: String(user._id),
      meta: { reason: req.body.reason },
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
    return ok(res, null, 'User deactivated');
  }),
);

adminRouter.get(
  '/audit-logs',
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const [items, total] = await Promise.all([
      AuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(),
    ]);
    return ok(res, items, 'Audit logs retrieved', 200, buildPagination(page, limit, total));
  }),
);