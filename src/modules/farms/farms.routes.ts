import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../auth/auth.middleware.js';
import { validate } from '../../common/middleware/validate.js';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { Farm } from './farm.model.js';
import { AppError } from '../../common/errors/AppError.js';
import { buildPagination, created, ok, parsePagination } from '../../common/utils/apiResponse.js';
import { KENYAN_COUNTIES } from '../../common/constants/counties.js';
import { ROLES } from '../../common/constants/roles.js';

const createSchema = z.object({
  name: z.string().min(1).max(200),
  county: z.enum(KENYAN_COUNTIES),
  town: z.string().max(120).optional(),
  size: z.number().min(0).optional(),
  sizeUnit: z.enum(['acres', 'hectares']).optional(),
  crops: z.array(z.string().max(80)).max(30).default([]),
  farmingMethods: z.array(z.string().max(60)).max(20).default([]),
  coordinates: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).optional(),
});

const updateSchema = createSchema.partial().extend({ isActive: z.boolean().optional() });

export const farmsRouter = Router();

farmsRouter.post(
  '/',
  authenticate,
  requireRole(ROLES.FARMER),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const farm = await Farm.create({ farmer: req.user!.id, ...req.body });
    return created(res, { farm });
  }),
);

farmsRouter.get(
  '/mine',
  authenticate,
  requireRole(ROLES.FARMER),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const filter = { farmer: req.user!.id };
    const [items, total] = await Promise.all([
      Farm.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Farm.countDocuments(filter),
    ]);
    return ok(res, items, 'Farms retrieved', 200, buildPagination(page, limit, total));
  }),
);

farmsRouter.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const farm = await Farm.findById(req.params.id);
    if (!farm) throw AppError.notFound('Farm not found');
    const isOwner = String(farm.farmer) === req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';
    // Hide coordinates unless owner/admin
    const obj = farm.toObject() as Record<string, unknown>;
    if (!isOwner && !isAdmin) {
      delete obj.coordinates;
    }
    return ok(res, { farm: obj });
  }),
);

farmsRouter.patch(
  '/:id',
  authenticate,
  requireRole(ROLES.FARMER),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const farm = await Farm.findById(req.params.id);
    if (!farm) throw AppError.notFound('Farm not found');
    if (String(farm.farmer) !== req.user!.id) throw AppError.forbidden('Not your farm');
    Object.assign(farm, req.body);
    await farm.save();
    return ok(res, { farm }, 'Farm updated');
  }),
);

farmsRouter.delete(
  '/:id',
  authenticate,
  requireRole(ROLES.FARMER),
  asyncHandler(async (req, res) => {
    const farm = await Farm.findById(req.params.id);
    if (!farm) throw AppError.notFound('Farm not found');
    if (String(farm.farmer) !== req.user!.id) throw AppError.forbidden('Not your farm');
    farm.isActive = false;
    await farm.save();
    return ok(res, null, 'Farm deactivated');
  }),
);