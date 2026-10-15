import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../auth/auth.middleware.js';
import { validate, validateMultiple } from '../../common/middleware/validate.js';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { buildPagination, created, ok, parsePagination } from '../../common/utils/apiResponse.js';
import { withIdempotency } from '../../common/utils/idempotency.js';
import * as service from './order.service.js';
import { ROLES } from '../../common/constants/roles.js';
import { requireRole } from '../auth/auth.middleware.js';

const createOrderSchema = z.object({
  farmerId: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().positive().max(1_000_000),
      }),
    )
    .min(1)
    .max(50),
  deliveryMethod: z.enum(['pickup', 'delivery']),
  deliveryLocation: z.string().max(500).optional(),
  buyerNotes: z.string().max(2000).optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  status: z.string().optional(),
});

const transitionSchema = z.object({
  status: z.enum([
    'ACCEPTED','REJECTED','PREPARING','READY_FOR_PICKUP','IN_TRANSIT','DELIVERED','COMPLETED','CANCELLED',
  ]),
  note: z.string().max(500).optional(),
});

export const ordersRouter = Router();

ordersRouter.post(
  '/',
  authenticate,
  requireRole(ROLES.BUYER),
  validate(createOrderSchema),
  asyncHandler(async (req, res) => {
    const key = req.header('idempotency-key');
    const { data: order, replayed } = await withIdempotency(
      key,
      'orders.create',
      req.user!.id,
      () => service.createOrder({ buyerId: req.user!.id, ...req.body }),
    );
    return created(res, { order, replayed }, 'Order created');
  }),
);

ordersRouter.get(
  '/buyer',
  authenticate,
  requireRole(ROLES.BUYER),
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const filter: Record<string, unknown> = { buyer: req.user!.id };
    if (req.query.status) filter.status = req.query.status;
    const { items, total } = await service.listOrders(filter, skip, limit);
    return ok(res, items, 'Buyer orders retrieved', 200, buildPagination(page, limit, total));
  }),
);

ordersRouter.get(
  '/farmer',
  authenticate,
  requireRole(ROLES.FARMER),
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const filter: Record<string, unknown> = { farmer: req.user!.id };
    if (req.query.status) filter.status = req.query.status;
    const { items, total } = await service.listOrders(filter, skip, limit);
    return ok(res, items, 'Farmer orders retrieved', 200, buildPagination(page, limit, total));
  }),
);

ordersRouter.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const order = await service.getOrderForUser(req.params.id, req.user!.id);
    return ok(res, { order });
  }),
);

ordersRouter.patch(
  '/:id/status',
  authenticate,
  validate(transitionSchema),
  asyncHandler(async (req, res) => {
    const order = await service.transitionStatus(
      req.params.id,
      req.user!.id,
      req.body.status,
      req.body.note,
    );
    return ok(res, { order }, 'Order status updated');
  }),
);