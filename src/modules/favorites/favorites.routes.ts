import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { Favorite } from './favorite.model.js';
import { ok } from '../../common/utils/apiResponse.js';

export const favoritesRouter = Router();

favoritesRouter.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const items = await Favorite.find({ user: req.user!.id })
      .populate('product')
      .sort({ createdAt: -1 })
      .lean();
    return ok(res, items, 'Favorites retrieved');
  }),
);

favoritesRouter.post(
  '/:productId',
  authenticate,
  asyncHandler(async (req, res) => {
    await Favorite.updateOne(
      { user: req.user!.id, product: req.params.productId },
      { $setOnInsert: { user: req.user!.id, product: req.params.productId } },
      { upsert: true },
    );
    return ok(res, null, 'Added to favorites');
  }),
);

favoritesRouter.delete(
  '/:productId',
  authenticate,
  asyncHandler(async (req, res) => {
    await Favorite.deleteOne({ user: req.user!.id, product: req.params.productId });
    return ok(res, null, 'Removed from favorites');
  }),
);