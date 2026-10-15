import { Router } from 'express';
import { z } from 'zod';
import { authenticate, optionalAuthenticate, requireRole } from '../auth/auth.middleware.js';
import { validate } from '../../common/middleware/validate.js';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import { Product } from './product.model.js';
import { Farm } from '../farms/farm.model.js';
import { buildPagination, created, ok, parsePagination } from '../../common/utils/apiResponse.js';
import { ROLES } from '../../common/constants/roles.js';
import { PRODUCT_UNITS, QUALITY_GRADES, FARMING_METHODS, PRODUCT_STATUSES } from '../../common/constants/units.js';
import { KENYAN_COUNTIES } from '../../common/constants/counties.js';

const createSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1),
  description: z.string().min(1).max(4000),
  images: z.array(z.string().url().max(500)).max(10).default([]),
  quantityAvailable: z.number().positive(),
  unit: z.enum(PRODUCT_UNITS),
  priceKes: z.number().positive(),
  minimumOrderQuantity: z.number().positive(),
  qualityGrade: z.enum(QUALITY_GRADES).default('ungraded'),
  farmingMethod: z.enum(FARMING_METHODS),
  county: z.enum(KENYAN_COUNTIES),
  town: z.string().max(120).optional(),
  farm: z.string().optional(),
  harvestDate: z.string().datetime().optional(),
  expectedHarvestDate: z.string().datetime().optional(),
  status: z.enum(PRODUCT_STATUSES).optional().default('PUBLISHED'),
});

const updateSchema = createSchema.partial();

export const productsRouter = Router();

productsRouter.post(
  '/',
  authenticate,
  requireRole(ROLES.FARMER),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const body = req.body;
    if (body.farm) {
      const farm = await Farm.findById(body.farm);
      if (!farm || String(farm.farmer) !== req.user!.id) {
        throw AppError.forbidden('Farm does not belong to you');
      }
    }
    const priceCents = Math.round(body.priceKes * 100);
    const product = await Product.create({
      farmer: req.user!.id,
      farm: body.farm,
      name: body.name,
      category: body.category,
      description: body.description,
      images: body.images,
      quantityAvailable: body.quantityAvailable,
      unit: body.unit,
      priceCents,
      minimumOrderQuantity: body.minimumOrderQuantity,
      qualityGrade: body.qualityGrade,
      farmingMethod: body.farmingMethod,
      county: body.county,
      town: body.town,
      harvestDate: body.harvestDate ? new Date(body.harvestDate) : undefined,
      expectedHarvestDate: body.expectedHarvestDate ? new Date(body.expectedHarvestDate) : undefined,
      status: body.status,
    });
    return created(res, { product });
  }),
);

productsRouter.get(
  '/',
  validate(z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    category: z.string().optional(),
    county: z.string().optional(),
    q: z.string().optional(),
    minPrice: z.coerce.number().optional(),
    maxPrice: z.coerce.number().optional(),
    sort: z.enum(['newest', 'price_asc', 'price_desc', 'relevance']).optional(),
  }), 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const filter: Record<string, unknown> = { status: 'PUBLISHED' };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.county) filter.county = req.query.county;
    if (req.query.q) {
      filter.$text = { $search: req.query.q as string };
    }
    if (req.query.minPrice || req.query.maxPrice) {
      const range: Record<string, number> = {};
      if (req.query.minPrice) range.$gte = Number(req.query.minPrice) * 100;
      if (req.query.maxPrice) range.$lte = Number(req.query.maxPrice) * 100;
      filter.priceCents = range;
    }

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      newest: { createdAt: -1 },
      price_asc: { priceCents: 1 },
      price_desc: { priceCents: -1 },
      relevance: { createdAt: -1 },
    };
    const sort = sortMap[(req.query.sort as string) || 'newest'] ?? { createdAt: -1 };

    const [items, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);
    return ok(res, items, 'Products retrieved', 200, buildPagination(page, limit, total));
  }),
);

productsRouter.get(
  '/my',
  authenticate,
  requireRole(ROLES.FARMER),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const filter = { farmer: req.user!.id };
    const [items, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);
    return ok(res, items, 'Your products retrieved', 200, buildPagination(page, limit, total));
  }),
);

productsRouter.get(
  '/:id',
  optionalAuthenticate,
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id).lean();
    if (!product) throw AppError.notFound('Product not found');
    const isOwner = req.user && String(product.farmer) === req.user.id;
    if (product.status !== 'PUBLISHED' && !isOwner && req.user?.role !== 'ADMIN') {
      throw AppError.notFound('Product not found');
    }
    return ok(res, { product });
  }),
);

productsRouter.patch(
  '/:id',
  authenticate,
  requireRole(ROLES.FARMER),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw AppError.notFound('Product not found');
    if (String(product.farmer) !== req.user!.id) throw AppError.forbidden('Not your product');

    const body = req.body;
    if (body.priceKes !== undefined) product.priceCents = Math.round(body.priceKes * 100);
    if (body.name !== undefined) product.name = body.name;
    if (body.description !== undefined) product.description = body.description;
    if (body.category !== undefined) product.category = body.category;
    if (body.images !== undefined) product.images = body.images;
    if (body.quantityAvailable !== undefined) product.quantityAvailable = body.quantityAvailable;
    if (body.unit !== undefined) product.unit = body.unit;
    if (body.minimumOrderQuantity !== undefined) product.minimumOrderQuantity = body.minimumOrderQuantity;
    if (body.qualityGrade !== undefined) product.qualityGrade = body.qualityGrade;
    if (body.farmingMethod !== undefined) product.farmingMethod = body.farmingMethod;
    if (body.county !== undefined) product.county = body.county;
    if (body.town !== undefined) product.town = body.town;
    if (body.status !== undefined) product.status = body.status;
    if (body.harvestDate !== undefined) product.harvestDate = new Date(body.harvestDate);
    if (body.expectedHarvestDate !== undefined) product.expectedHarvestDate = new Date(body.expectedHarvestDate);

    await product.save();
    return ok(res, { product }, 'Product updated');
  }),
);

productsRouter.delete(
  '/:id',
  authenticate,
  requireRole(ROLES.FARMER),
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw AppError.notFound('Product not found');
    if (String(product.farmer) !== req.user!.id) throw AppError.forbidden('Not your product');
    product.status = 'ARCHIVED';
    await product.save();
    return ok(res, null, 'Product archived');
  }),
);