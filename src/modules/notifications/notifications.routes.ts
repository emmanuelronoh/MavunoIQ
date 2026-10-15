import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { Notification } from './notification.model.js';
import { buildPagination, ok, parsePagination } from '../../common/utils/apiResponse.js';

export const notificationsRouter = Router();

notificationsRouter.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const filter = { user: req.user!.id };
    const [items, total, unread] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...filter, readAt: null }),
    ]);
    return ok(
      res,
      items,
      'Notifications retrieved',
      200,
      { ...buildPagination(page, limit, total), unread },
    );
  }),
);

notificationsRouter.post(
  '/:id/read',
  authenticate,
  asyncHandler(async (req, res) => {
    await Notification.updateOne(
      { _id: req.params.id, user: req.user!.id },
      { readAt: new Date() },
    );
    return ok(res, null, 'Marked as read');
  }),
);

notificationsRouter.post(
  '/read-all',
  authenticate,
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ user: req.user!.id, readAt: null }, { readAt: new Date() });
    return ok(res, null, 'All marked as read');
  }),
);

notificationsRouter.delete(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    await Notification.deleteOne({ _id: req.params.id, user: req.user!.id });
    return ok(res, null, 'Deleted');
  }),
);