import { Router } from 'express';
import { authenticate } from '../auth/auth.middleware.js';
import { validate } from '../../common/middleware/validate.js';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { updateProfileSchema } from './users.schemas.js';
import * as service from './users.service.js';
import { ok } from '../../common/utils/apiResponse.js';

export const usersRouter = Router();

usersRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await service.getById(req.user!.id);
    return ok(res, { user: sanitize(user) });
  }),
);

usersRouter.patch(
  '/me',
  authenticate,
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const user = await service.updateProfile(req.user!.id, req.body);
    return ok(res, { user: sanitize(user) }, 'Profile updated');
  }),
);

usersRouter.post(
  '/me/deactivate',
  authenticate,
  asyncHandler(async (req, res) => {
    await service.deactivateAccount(req.user!.id);
    res.clearCookie('mavunoiq_rt', { path: '/' });
    return ok(res, null, 'Account deactivated');
  }),
);

function sanitize(u: { _id: unknown; email: string; firstName: string; lastName: string; role: string; isEmailVerified: boolean; isActive: boolean; avatarUrl?: string; phone?: string; lastLoginAt?: Date }) {
  return {
    id: String(u._id),
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
    isEmailVerified: u.isEmailVerified,
    isActive: u.isActive,
    avatarUrl: u.avatarUrl,
    phone: u.phone,
    lastLoginAt: u.lastLoginAt,
  };
}