import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin, requireRole } from '../auth/auth.middleware.js';
import { validate } from '../../common/middleware/validate.js';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import { VerificationRequest } from './verificationRequest.model.js';
import { FarmerProfile } from '../farmers/farmer.model.js';
import { BuyerProfile } from '../buyers/buyer.model.js';
import { created, ok } from '../../common/utils/apiResponse.js';
import { notify } from '../notifications/notification.service.js';
import { ROLES } from '../../common/constants/roles.js';

const submitSchema = z.object({
  documentKeys: z.array(z.string().min(1).max(300)).min(1).max(10),
  notes: z.string().max(2000).optional(),
});

const decideSchema = z.object({
  decision: z.enum(['VERIFIED', 'REJECTED']),
  notes: z.string().max(2000).optional(),
});

export const verificationRouter = Router();

verificationRouter.post(
  '/',
  authenticate,
  requireRole(ROLES.FARMER, ROLES.BUYER),
  validate(submitSchema),
  asyncHandler(async (req, res) => {
    const pending = await VerificationRequest.findOne({ user: req.user!.id, status: 'PENDING' });
    if (pending) throw AppError.conflict('You already have a pending verification request');

    const vr = await VerificationRequest.create({
      user: req.user!.id,
      role: req.user!.role === ROLES.FARMER ? 'FARMER' : 'BUYER',
      documentKeys: req.body.documentKeys,
      notes: req.body.notes,
    });
    return created(res, { verification: vr });
  }),
);

verificationRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const items = await VerificationRequest.find({ user: req.user!.id }).sort({ createdAt: -1 });
    return ok(res, items, 'Your verification requests');
  }),
);

verificationRouter.get(
  '/',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const status = (req.query.status as string) || 'PENDING';
    const items = await VerificationRequest.find({ status }).sort({ createdAt: 1 }).limit(200).lean();
    return ok(res, items, 'Verification requests retrieved');
  }),
);

verificationRouter.post(
  '/:id/decide',
  authenticate,
  requireAdmin,
  validate(decideSchema),
  asyncHandler(async (req, res) => {
    const vr = await VerificationRequest.findById(req.params.id);
    if (!vr) throw AppError.notFound('Request not found');
    if (vr.status !== 'PENDING') throw AppError.badRequest('Already decided');

    vr.status = req.body.decision;
    vr.reviewer = req.user!.id as unknown as typeof vr.reviewer;
    vr.reviewedAt = new Date();
    vr.decisionNotes = req.body.notes;
    await vr.save();

    if (vr.role === 'FARMER') {
      await FarmerProfile.updateOne({ user: vr.user }, { verificationStatus: req.body.decision });
    } else {
      await BuyerProfile.updateOne({ user: vr.user }, { verificationStatus: req.body.decision });
    }

    await notify({
      userId: String(vr.user),
      type: 'VERIFICATION_DECISION',
      title: `Verification ${req.body.decision.toLowerCase()}`,
      body: req.body.notes || 'Your verification request has been reviewed.',
    });

    return ok(res, { verification: vr }, 'Decision recorded');
  }),
);