import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { ok } from '../../common/utils/apiResponse.js';
import { Order } from '../orders/order.model.js';
import { Product } from '../products/product.model.js';

export const demandForecastingRouter = Router();

demandForecastingRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const crop = String(req.query.crop || '').trim();
    const county = req.query.county ? String(req.query.county) : undefined;

    // Measured activity: count recent completed/pending orders for products matching crop
    const matchProduct: Record<string, unknown> = { status: 'PUBLISHED' };
    if (crop) matchProduct.name = new RegExp(crop, 'i');
    if (county) matchProduct.county = county;

    const products = await Product.find(matchProduct).select('_id').lean();
    const productIds = products.map((p) => p._id);

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const orderAgg = productIds.length
      ? await Order.aggregate([
          { $match: { 'items.product': { $in: productIds }, createdAt: { $gte: since } } },
          { $unwind: '$items' },
          { $match: { 'items.product': { $in: productIds } } },
          {
            $group: {
              _id: null,
              totalQuantity: { $sum: '$items.quantity' },
              orders: { $sum: 1 },
            },
          },
        ])
      : [];

    const totalQuantity = orderAgg[0]?.totalQuantity ?? 0;
    const orderCount = orderAgg[0]?.orders ?? 0;
    const supplyListings = products.length;

    const enough = orderCount >= 5;
    const isDemo = !enough;

    return ok(res, {
      crop: crop || null,
      county: county ?? null,
      measuredActivity: {
        ordersLast30Days: orderCount,
        quantityOrderedLast30Days: totalQuantity,
        activeSupplyListings: supplyListings,
      },
      estimatedDemand: null,
      status: enough ? 'measured' : 'insufficient_data',
      isDemo,
      notes: enough
        ? 'Measured from platform order activity.'
        : 'Insufficient platform data to estimate demand. Values shown are measured counts only.',
      generatedAt: new Date().toISOString(),
    }, 'Demand summary retrieved');
  }),
);