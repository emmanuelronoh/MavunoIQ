import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../auth/auth.middleware.js';
import { validate } from '../../common/middleware/validate.js';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import { Review } from './review.model.js';
import { Order } from '../orders/order.model.js';
import { FarmerProfile } from '../farmers/farmer.model.js';
import { BuyerProfile } from '../buyers/buyer.model.js';
import { created, ok } from '../../common/utils/apiResponse.js';

const createSchema = z.object({
  orderId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(2000).optional(),
});

export const reviewsRouter = Router();

reviewsRouter.post(
  '/',
  authenticate,
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { orderId, rating, text } = req.body;
    const order = await Order.findById(orderId);
    if (!order) throw AppError.notFound('Order not found');
    if (order.status !== 'COMPLETED') throw AppError.badRequest('Order not completed');
    if (String(order.buyer) !== req.user!.id && String(order.farmer) !== req.user!.id) {
      throw AppError.forbidden('Not a participant');
    }
    const reviewed = String(order.buyer) === req.user!.id ? order.farmer : order.buyer;

    const existing = await Review.findOne({ reviewer: req.user!.id, order: order._id });
    if (existing) throw AppError.conflict('Review already submitted for this order');

    const review = await Review.create({
      reviewer: req.user!.id,
      reviewed,
      order: order._id,
      rating,
      text,
    });

    // Recalculate average for the reviewed user's profile (farmer or buyer)
    const agg = await Review.aggregate([
      { $match: { reviewed: reviewed } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const avg = agg[0]?.avg ?? 0;
    const count = agg[0]?.count ?? 0;
    await FarmerProfile.updateOne({ user: reviewed }, { rating: avg, ratingCount: count });
    await BuyerProfile.updateOne({ user: reviewed }, { rating: avg, ratingCount: count });

    return created(res, { review });
  }),
);

reviewsRouter.get(
  '/user/:userId',
  asyncHandler(async (req, res) => {
    const items = await Review.find({ reviewed: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return ok(res, items, 'Reviews retrieved');
  }),
);