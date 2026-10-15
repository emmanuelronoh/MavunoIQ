import mongoose from 'mongoose';
import { Order, type IOrder, type IOrderItem } from './order.model.js';
import { Product } from '../products/product.model.js';
import { AppError } from '../../common/errors/AppError.js';
import { addCents, multiplyCents } from '../../common/utils/money.js';
import { notify } from '../notifications/notification.service.js';
import { logger } from '../../config/logger.js';

const LEGAL_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY_FOR_PICKUP', 'CANCELLED'],
  READY_FOR_PICKUP: ['IN_TRANSIT', 'DELIVERED', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MVQ-${ts}-${rand}`;
}

export interface CreateOrderInput {
  buyerId: string;
  farmerId: string;
  items: { productId: string; quantity: number }[];
  deliveryMethod: 'pickup' | 'delivery';
  deliveryLocation?: string;
  buyerNotes?: string;
  deliveryFeeCents?: number;
}

export async function createOrder(input: CreateOrderInput): Promise<IOrder> {
  if (input.items.length === 0) throw AppError.badRequest('Order must have at least one item');
  if (input.deliveryMethod === 'delivery' && !input.deliveryLocation) {
    throw AppError.badRequest('Delivery location is required for delivery orders');
  }

  const productIds = input.items.map((i) => i.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  if (products.length !== productIds.length) {
    throw AppError.badRequest('One or more products not found');
  }

  // Verify all products belong to the same farmer
  for (const p of products) {
    if (String(p.farmer) !== input.farmerId) {
      throw AppError.badRequest('All items must belong to the specified farmer');
    }
    if (p.status !== 'PUBLISHED') {
      throw AppError.badRequest(`Product "${p.name}" is not available`);
    }
  }

  const items: IOrderItem[] = [];
  for (const item of input.items) {
    const product = products.find((p) => String(p._id) === item.productId)!;
    if (item.quantity < product.minimumOrderQuantity) {
      throw AppError.badRequest(
        `Quantity for "${product.name}" is below minimum order quantity of ${product.minimumOrderQuantity} ${product.unit}`,
      );
    }
    const available = product.quantityAvailable - product.quantityReserved;
    if (item.quantity > available) {
      throw AppError.badRequest(`Insufficient quantity for "${product.name}"`);
    }
    const subtotal = multiplyCents(product.priceCents, item.quantity);
    items.push({
      product: product._id,
      name: product.name,
      quantity: item.quantity,
      unit: product.unit,
      unitPriceCents: product.priceCents,
      subtotalCents: subtotal,
    });
  }

  const subtotalCents = addCents(...items.map((i) => i.subtotalCents));
  const deliveryFeeCents = input.deliveryFeeCents ?? 0;
  const totalCents = subtotalCents + deliveryFeeCents;

  const session = await mongoose.startSession();
  let order: IOrder;
  try {
    let created: IOrder | undefined;
    await session.withTransaction(async () => {
      // Reserve inventory
      for (const item of input.items) {
        const res = await Product.updateOne(
          {
            _id: item.productId,
            $expr: { $gte: [{ $subtract: ['$quantityAvailable', '$quantityReserved'] }, item.quantity] },
          },
          { $inc: { quantityReserved: item.quantity } },
          { session },
        );
        if (res.modifiedCount !== 1) {
          throw AppError.badRequest('Insufficient inventory for one or more items');
        }
      }

      const docs = await Order.create(
        [
          {
            orderNumber: generateOrderNumber(),
            buyer: input.buyerId,
            farmer: input.farmerId,
            items,
            subtotalCents,
            deliveryFeeCents,
            totalCents,
            deliveryMethod: input.deliveryMethod,
            deliveryLocation: input.deliveryLocation,
            buyerNotes: input.buyerNotes,
            status: 'PENDING',
            paymentStatus: 'UNPAID',
            statusHistory: [{ status: 'PENDING', at: new Date(), by: input.buyerId }],
          },
        ],
        { session },
      );
      created = docs[0];
    });
    if (!created) throw AppError.internal('Order creation failed');
    order = created;
  } catch (err) {
    logger.error({ err }, 'Order creation failed, transaction aborted');
    throw err;
  } finally {
    await session.endSession();
  }

  await notify({
    userId: input.farmerId,
    type: 'ORDER_NEW',
    title: 'New order received',
    body: `Order ${order.orderNumber} for KES ${(totalCents / 100).toFixed(2)}`,
    data: { orderId: String(order._id) },
  });

  return order;
}

export async function transitionStatus(
  orderId: string,
  actorId: string,
  nextStatus: string,
  note?: string,
): Promise<IOrder> {
  const order = await Order.findById(orderId);
  if (!order) throw AppError.notFound('Order not found');

  const isBuyer = String(order.buyer) === actorId;
  const isFarmer = String(order.farmer) === actorId;
  if (!isBuyer && !isFarmer) throw AppError.forbidden('Not a participant in this order');

  const allowed = LEGAL_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw AppError.badRequest(`Cannot transition from ${order.status} to ${nextStatus}`);
  }

  // Role-specific rules
  if (nextStatus === 'ACCEPTED' || nextStatus === 'REJECTED') {
    if (!isFarmer) throw AppError.forbidden('Only the farmer can accept or reject orders');
  }
  if (nextStatus === 'PREPARING' || nextStatus === 'READY_FOR_PICKUP') {
    if (!isFarmer) throw AppError.forbidden('Only the farmer can update preparation status');
  }
  if (nextStatus === 'COMPLETED') {
    if (!isBuyer) throw AppError.forbidden('Only the buyer can confirm completion');
  }
  if (nextStatus === 'CANCELLED') {
    if (order.status !== 'PENDING' && !isFarmer) {
      throw AppError.forbidden('Only the farmer can cancel after acceptance');
    }
  }

  order.status = nextStatus as IOrder['status'];
  order.statusHistory.push({ status: nextStatus as IOrder['status'], at: new Date(), by: actorId as unknown as mongoose.Types.ObjectId, note });
  if (nextStatus === 'ACCEPTED') order.acceptedAt = new Date();
  if (nextStatus === 'COMPLETED') order.completedAt = new Date();
  if (nextStatus === 'CANCELLED') {
    order.cancelledAt = new Date();
    order.cancellationReason = note;
    // Release inventory
    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { quantityReserved: -item.quantity } },
      );
    }
  }
  if (nextStatus === 'REJECTED') {
    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { quantityReserved: -item.quantity } },
      );
    }
  }

  await order.save();

  const notifyUserId = isBuyer ? order.farmer : order.buyer;
  await notify({
    userId: String(notifyUserId),
    type: 'ORDER_STATUS',
    title: `Order ${order.orderNumber} status updated`,
    body: `New status: ${nextStatus}`,
    data: { orderId: String(order._id), status: nextStatus },
  });

  return order;
}

export async function listOrders(filter: Record<string, unknown>, skip: number, limit: number) {
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
  return { items, total };
}

export async function getOrderForUser(orderId: string, userId: string): Promise<IOrder> {
  const order = await Order.findById(orderId);
  if (!order) throw AppError.notFound('Order not found');
  if (String(order.buyer) !== userId && String(order.farmer) !== userId) {
    throw AppError.forbidden('Not a participant in this order');
  }
  return order;
}