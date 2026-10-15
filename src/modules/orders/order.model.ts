import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { ORDER_STATUSES, PAYMENT_STATUSES, type OrderStatus, type PaymentStatus } from '../../common/constants/units.js';

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  name: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  subtotalCents: number;
}

export interface IStatusEvent {
  status: OrderStatus;
  at: Date;
  by?: mongoose.Types.ObjectId;
  note?: string;
}

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  orderNumber: string;
  buyer: mongoose.Types.ObjectId;
  farmer: mongoose.Types.ObjectId;
  items: IOrderItem[];
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  currency: 'KES';
  deliveryMethod: 'pickup' | 'delivery';
  deliveryLocation?: string;
  buyerNotes?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  statusHistory: IStatusEvent[];
  acceptedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0.001 },
    unit: { type: String, required: true },
    unitPriceCents: { type: Number, required: true, min: 0 },
    subtotalCents: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const statusEventSchema = new Schema<IStatusEvent>(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, default: Date.now },
    by: { type: Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, maxlength: 500 },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    buyer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    farmer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], required: true, validate: (v: IOrderItem[]) => v.length > 0 },
    subtotalCents: { type: Number, required: true, min: 0 },
    deliveryFeeCents: { type: Number, default: 0, min: 0 },
    totalCents: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'KES', enum: ['KES'] },
    deliveryMethod: { type: String, enum: ['pickup', 'delivery'], required: true },
    deliveryLocation: { type: String, maxlength: 500 },
    buyerNotes: { type: String, maxlength: 2000 },
    status: { type: String, enum: ORDER_STATUSES, default: 'PENDING', index: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'UNPAID', index: true },
    statusHistory: { type: [statusEventSchema], default: [] },
    acceptedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

orderSchema.index({ buyer: 1, status: 1, createdAt: -1 });
orderSchema.index({ farmer: 1, status: 1, createdAt: -1 });

export const Order: Model<IOrder> = mongoose.models.Order || mongoose.model<IOrder>('Order', orderSchema);