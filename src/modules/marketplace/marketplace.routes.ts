import { Router } from 'express';
// Marketplace is largely a public view over products; we expose a thin alias.
import { productsRouter } from '../products/products.routes.js';

export const marketplaceRouter = Router();
// Reuse product listing/search under /marketplace for convenience
marketplaceRouter.use('/', productsRouter);