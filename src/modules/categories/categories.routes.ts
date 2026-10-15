import { Router } from 'express';
import { authenticate, requireAdmin } from '../auth/auth.middleware.js';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { Category } from './category.model.js';
import { ok, created } from '../../common/utils/apiResponse.js';
import { z } from 'zod';
import { validate } from '../../common/middleware/validate.js';

const createSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  parent: z.string().optional(),
  iconEmoji: z.string().max(8).optional(),
});

export const categoriesRouter = Router();

categoriesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const items = await Category.find({ isActive: true }).sort({ name: 1 }).lean();
    return ok(res, items, 'Categories retrieved');
  }),
);

categoriesRouter.post(
  '/',
  authenticate,
  requireAdmin,
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const cat = await Category.create(req.body);
    return created(res, { category: cat });
  }),
);