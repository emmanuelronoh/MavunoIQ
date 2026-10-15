import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../auth/auth.middleware.js';
import { validate } from '../../common/middleware/validate.js';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { FarmerProfile } from './farmer.model.js';
import { AppError } from '../../common/errors/AppError.js';
import { created, ok } from '../../common/utils/apiResponse.js';
import { KENYAN_COUNTIES } from '../../common/constants/counties.js';
import { ROLES } from '../../common/constants/roles.js';

const upsertSchema = z.object({
  displayName: z.string().min(1).max(120),
  phone: z.string().max(32).optional(),
  county: z.enum(KENYAN_COUNTIES),
  town: z.string().max(120).optional(),
  farmingExperienceYears: z.number().min(0).max(100).optional(),
  farmSize: z.number().min(0).optional(),
  farmSizeUnit: z.enum(['acres', 'hectares']).optional(),
  mainCrops: z.array(z.string().max(80)).max(30).default([]),
  farmingMethods: z.array(z.string().max(60)).max(20).default([]),
  biography: z.string().max(2000).optional(),
  profileImageUrl: z.string().url().max(500).optional(),
});

export const farmersRouter = Router();

farmersRouter.get(
  '/me',
  authenticate,
  requireRole(ROLES.FARMER),
  asyncHandler(async (req, res) => {
    const profile = await FarmerProfile.findOne({ user: req.user!.id });
    return ok(res, { profile });
  }),
);

farmersRouter.put(
  '/me',
  authenticate,
  requireRole(ROLES.FARMER),
  validate(upsertSchema),
  asyncHandler(async (req, res) => {
    const existing = await FarmerProfile.findOne({ user: req.user!.id });
    if (existing) {
      // Never allow role/verification to change here
      const { displayName, phone, county, town, farmingExperienceYears, farmSize, farmSizeUnit, mainCrops, farmingMethods, biography, profileImageUrl } = req.body;
      Object.assign(existing, {
        displayName, phone, county, town, farmingExperienceYears, farmSize, farmSizeUnit, mainCrops, farmingMethods, biography, profileImageUrl,
      });
      await existing.save();
      return ok(res, { profile: existing }, 'Profile updated');
    }
    const profile = await FarmerProfile.create({ user: req.user!.id, ...req.body });
    return created(res, { profile }, 'Profile created');
  }),
);

farmersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const profile = await FarmerProfile.findById(req.params.id).lean();
    if (!profile) throw AppError.notFound('Farmer not found');
    // Never expose private data here
    return ok(res, { profile: { ...profile, phone: undefined } });
  }),
);