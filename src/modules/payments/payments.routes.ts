import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../auth/auth.middleware.js';
import { validate } from '../../common/middleware/validate.js';
import { asyncHandler } from '../../common/middleware/asyncHandler.js';
import { AppError } from '../../common/errors/AppError.js';
import { Payment } from './payment.model.js';
import { Order } from '../orders/order.model.js';
import { paymentProvider } from '../../integrations/payments/index.js';
import { created, ok } from '../../common/utils/apiResponse.js';
import { notify } from '../notifications/notification.service.js';
import { logger } from '../../config/logger.js';
import { ROLES } from '../../common/constants/roles.js';

export const paymentsRouter = Router();

const stkPushSchema = z.object({
  orderId: z.string().min(1),
  phone: z.string().min(9).max(20),
});

paymentsRouter.post(
  '/mpesa/stk-push',
  authenticate,
  requireRole(ROLES.BUYER),
  validate(stkPushSchema),
  asyncHandler(async (req, res) => {
    const { orderId, phone } = req.body;
    const order = await Order.findById(orderId);
    if (!order) throw AppError.notFound('Order not found');
    if (String(order.buyer) !== req.user!.id) throw AppError.forbidden('Not your order');
    if (order.paymentStatus === 'PAID') throw AppError.badRequest('Order already paid');
    if (!['PENDING', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'IN_TRANSIT', 'DELIVERED'].includes(order.status)) {
      throw AppError.badRequest('Order is not eligible for payment');
    }

    const existingPending = await Payment.findOne({ order: order._id, status: 'PENDING' });
    if (existingPending) {
      return ok(res, {
        paymentId: String(existingPending._id),
        provider: existingPending.provider,
        isDemo: existingPending.isDemo,
        checkoutRequestId: existingPending.checkoutRequestId,
        message: 'A pending payment already exists for this order',
      }, 'Pending payment exists');
    }

    const result = await paymentProvider.initiateSTKPush({
      phone,
      amountCents: order.totalCents,
      accountReference: order.orderNumber,
      transactionDesc: `MavunoIQ order ${order.orderNumber}`,
    });

    const payment = await Payment.create({
      order: order._id,
      payer: req.user!.id,
      amountCents: order.totalCents,
      provider: result.provider,
      isDemo: result.isDemo,
      status: 'PENDING',
      merchantRequestId: result.merchantRequestId,
      checkoutRequestId: result.checkoutRequestId,
      resultDesc: result.responseDescription,
    });

    order.paymentStatus = 'PENDING';
    await order.save();

    return created(res, {
      paymentId: String(payment._id),
      provider: result.provider,
      isDemo: result.isDemo,
      checkoutRequestId: result.checkoutRequestId,
      customerMessage: result.customerMessage,
    }, 'Payment initiated');
  }),
);

// Callback from M-Pesa. Demo provider also posts here.
paymentsRouter.post(
  '/mpesa/callback',
  asyncHandler(async (req, res) => {
    const parsed = paymentProvider.parseCallback(req.body);
    logger.info(
      { checkoutRequestId: parsed.checkoutRequestId, resultCode: parsed.resultCode },
      'Payment callback received',
    );

    if (!parsed.checkoutRequestId) {
      return res.status(400).json({ ResultCode: 0, ResultDesc: 'Ignored' });
    }

    const payment = await Payment.findOne({ checkoutRequestId: parsed.checkoutRequestId });
    if (!payment) {
      // Acknowledge to avoid callback retries
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    // Idempotency: ignore if already finalized
    if (payment.status !== 'PENDING') {
      return res.json({ ResultCode: 0, ResultDesc: 'Already processed' });
    }

    payment.rawCallback = parsed.raw;
    payment.resultDesc = parsed.resultDesc;

    if (parsed.resultCode === 0) {
      payment.status = 'SUCCESS';
      payment.providerReceipt = parsed.mpesaReceiptNumber;
      await payment.save();

      const order = await Order.findById(payment.order);
      if (order) {
        order.paymentStatus = 'PAID';
        await order.save();
        await notify({
          userId: String(order.farmer),
          type: 'PAYMENT_SUCCESS',
          title: 'Payment received',
          body: `Payment for order ${order.orderNumber} confirmed`,
          data: { orderId: String(order._id) },
        });
        await notify({
          userId: String(order.buyer),
          type: 'PAYMENT_SUCCESS',
          title: 'Payment confirmed',
          body: `Your payment for order ${order.orderNumber} was successful`,
          data: { orderId: String(order._id) },
        });
      }
    } else {
      payment.status = 'FAILED';
      await payment.save();
      const order = await Order.findById(payment.order);
      if (order) {
        order.paymentStatus = 'FAILED';
        await order.save();
      }
    }

    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }),
);

paymentsRouter.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const payment = await Payment.findById(req.params.id);
    if (!payment) throw AppError.notFound('Payment not found');
    const order = await Order.findById(payment.order);
    if (!order) throw AppError.notFound('Order not found');
    if (String(order.buyer) !== req.user!.id && String(order.farmer) !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw AppError.forbidden();
    }
    return ok(res, { payment });
  }),
);