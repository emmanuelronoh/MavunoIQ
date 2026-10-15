import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { authenticate } from '../auth/auth.middleware.js';
import { validate } from '../../common/middleware/validate.js';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import { Conversation } from './conversation.model.js';
import { Message } from './message.model.js';
import { buildPagination, created, ok, parsePagination } from '../../common/utils/apiResponse.js';
import { sanitizeMultiline } from '../../common/utils/sanitize.js';
import { notify } from '../notifications/notification.service.js';

const startSchema = z.object({
  recipientId: z.string().min(1),
  productId: z.string().optional(),
  orderId: z.string().optional(),
  message: z.string().min(1).max(4000),
});

const sendSchema = z.object({
  body: z.string().min(1).max(4000),
});

export const messagingRouter = Router();

messagingRouter.post(
  '/conversations',
  authenticate,
  validate(startSchema),
  asyncHandler(async (req, res) => {
    const { recipientId, productId, orderId, message } = req.body;
    if (recipientId === req.user!.id) throw AppError.badRequest('Cannot message yourself');

    const participants = [req.user!.id, recipientId].sort();
    let convo = await Conversation.findOne({
      participants: { $all: participants, $size: 2 },
      product: productId || { $exists: false },
      order: orderId || { $exists: false },
    });
    if (!convo) {
      convo = await Conversation.create({
        participants,
        product: productId,
        order: orderId,
        lastMessageAt: new Date(),
      });
    }

    const msg = await Message.create({
      conversation: convo._id,
      sender: req.user!.id,
      body: sanitizeMultiline(message),
      readBy: [req.user!.id],
    });
    convo.lastMessageAt = msg.createdAt;
    convo.lastMessagePreview = msg.body.slice(0, 120);
    await convo.save();

    await notify({
      userId: recipientId,
      type: 'MESSAGE_NEW',
      title: 'New message',
      body: msg.body.slice(0, 100),
      data: { conversationId: String(convo._id) },
    });

    return created(res, { conversation: convo, message: msg }, 'Conversation started');
  }),
);

messagingRouter.get(
  '/conversations',
  authenticate,
  asyncHandler(async (req, res) => {
    const items = await Conversation.find({ participants: req.user!.id })
      .sort({ lastMessageAt: -1 })
      .limit(100)
      .lean();
    return ok(res, items, 'Conversations retrieved');
  }),
);

messagingRouter.get(
  '/conversations/:id/messages',
  authenticate,
  asyncHandler(async (req, res) => {
    const convo = await Conversation.findById(req.params.id);
    if (!convo) throw AppError.notFound('Conversation not found');
    if (!convo.participants.some((p) => String(p) === req.user!.id)) {
      throw AppError.forbidden('Not a participant');
    }
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const [items, total] = await Promise.all([
      Message.find({ conversation: convo._id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Message.countDocuments({ conversation: convo._id }),
    ]);
    return ok(res, items, 'Messages retrieved', 200, buildPagination(page, limit, total));
  }),
);

messagingRouter.post(
  '/conversations/:id/messages',
  authenticate,
  validate(sendSchema),
  asyncHandler(async (req, res) => {
    const convo = await Conversation.findById(req.params.id);
    if (!convo) throw AppError.notFound('Conversation not found');
    if (!convo.participants.some((p) => String(p) === req.user!.id)) {
      throw AppError.forbidden('Not a participant');
    }

    const msg = await Message.create({
      conversation: convo._id,
      sender: req.user!.id,
      body: sanitizeMultiline(req.body.body),
      readBy: [req.user!.id],
    });
    convo.lastMessageAt = msg.createdAt;
    convo.lastMessagePreview = msg.body.slice(0, 120);
    await convo.save();

    const recipient = convo.participants.find((p) => String(p) !== req.user!.id);
    if (recipient) {
      await notify({
        userId: String(recipient),
        type: 'MESSAGE_NEW',
        title: 'New message',
        body: msg.body.slice(0, 100),
        data: { conversationId: String(convo._id) },
      });
    }

    return created(res, { message: msg }, 'Message sent');
  }),
);

messagingRouter.post(
  '/conversations/:id/read',
  authenticate,
  asyncHandler(async (req, res) => {
    const convo = await Conversation.findById(req.params.id);
    if (!convo) throw AppError.notFound('Conversation not found');
    if (!convo.participants.some((p) => String(p) === req.user!.id)) {
      throw AppError.forbidden('Not a participant');
    }
    await Message.updateMany(
      { conversation: convo._id, readBy: { $ne: new mongoose.Types.ObjectId(req.user!.id) } },
      { $addToSet: { readBy: req.user!.id } },
    );
    return ok(res, null, 'Marked as read');
  }),
);