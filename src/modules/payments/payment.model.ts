import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IPayment extends Document {
  _id: mongoose.Types.ObjectId;
  order: mongoose.Types.ObjectId;
  payer: mongoose.Types.ObjectId;
  amountCents: number;
  currency: 'KES';
  provider: string;
  isDemo: boolean;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  merchantRequestId?: string;
  checkoutRequestId?: string;
  providerReceipt?: string;
  resultDesc?: string;
  rawCallback?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IPayment>(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    payer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amountCents: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'KES', enum: ['KES'] },
    provider: { type: String, required: true },
    isDemo: { type: Boolean, default: false },
    status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'], default: 'PENDING', index: true },
    merchantRequestId: { type: String, index: true },
    checkoutRequestId: { type: String, index: true, sparse: true },
    providerReceipt: { type: String },
    resultDesc: { type: String },
    rawCallback: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>('Payment', schema);