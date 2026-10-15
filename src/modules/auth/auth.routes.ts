import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { validate } from '../../common/middleware/validate.js';
import { authLimiter } from '../../common/middleware/rateLimiter.js';
import * as controller from './auth.controller.js';
import { authenticate } from './auth.middleware.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from './auth.schemas.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(controller.register),
);

authRouter.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(controller.login),
);

authRouter.post('/refresh', validate(refreshSchema), asyncHandler(controller.refresh));
authRouter.post('/logout', asyncHandler(controller.logout));
authRouter.get('/me', authenticate, asyncHandler(controller.me));
authRouter.post('/verify-email', validate(verifyEmailSchema), asyncHandler(controller.verifyEmail));
authRouter.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), asyncHandler(controller.forgotPassword));
authRouter.post('/reset-password', authLimiter, validate(resetPasswordSchema), asyncHandler(controller.resetPassword));
authRouter.post('/change-password', authenticate, validate(changePasswordSchema), asyncHandler(controller.changePassword));