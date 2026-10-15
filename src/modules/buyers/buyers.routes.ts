import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../auth/auth.middleware.js';
import { validate } from '../../common/middleware/validate.js';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { BuyerProfile } from './buyer.model.js';
import { AppError } from '../../common/errors/AppError.js';
import { created, ok } from '../../common/utils/apiResponse.js';
import { KENYAN_COUNTIES } from '../../common/constants/counties.js';
import { BUYER_TYPES } from '../../common/constants/units.js';
import { ROLES } from '../../common/constants/roles.js';

const upsertSchema = z.object({
  displayName: z.string().min(1).max(120),
  businessName: z.string().max(200).optional(),
  buyerType: z.enum(BUYER_TYPES),
  county: z.enum(KENYAN_COUNTIES),
  town: z.string().max(120).optional(),
  businessDescription: z.string().max(2000).optional(),
  contactPreference: z.enum(['in_app', 'email', 'phone']).default('in_app'),
  phone: z.string().max(32).optional(),
  profileImageUrl: z.string().url().max(500).optional(),
});

export const buyersRouter = Router();

buyersRouter.get(
  '/me',
  authenticate,
  requireRole(ROLES.BUYER),
  asyncHandler(async (req, res) => {
    const profile = await BuyerProfile.findOne({ user: req.user!.id });
    return ok(res, { profile });
  }),
);

buyersRouter.put(
  '/me',
  authenticate,
  requireRole(ROLES.BUYER),
  validate(upsertSchema),
  asyncHandler(async (req, res) => {
    const existing = await BuyerProfile.findOne({ user: req.user!.id });
    if (existing) {
      Object.assign(existing, req.body);
      await existing.save();
      return ok(res, { profile: existing }, 'Profile updated');
    }
    const profile = await BuyerProfile.create({ user: req.user!.id, ...req.body });
    return created(res, { profile }, 'Profile created');
  }),
);

buyersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const profile = await BuyerProfile.findById(req.params.id).lean();
    if (!profile) throw AppError.notFound('Buyer not found');
    return ok(res, { profile: { ...profile, phone: undefined } });
  }),
);