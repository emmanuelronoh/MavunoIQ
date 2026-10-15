import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { VERIFICATION_STATUSES, type VerificationStatus } from '../../common/constants/units.js';

export interface IVerificationRequest extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  role: 'FARMER' | 'BUYER';
  documentKeys: string[];
  notes?: string;
  status: VerificationStatus;
  reviewer?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  decisionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IVerificationRequest>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['FARMER', 'BUYER'], required: true },
    documentKeys: [{ type: String }],
    notes: { type: String, maxlength: 2000 },
    status: { type: String, enum: VERIFICATION_STATUSES, default: 'PENDING', index: true },
    reviewer: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    decisionNotes: { type: String, maxlength: 2000 },
  },
  { timestamps: true },
);

schema.index({ user: 1, status: 1 });

export const VerificationRequest: Model<IVerificationRequest> =
  mongoose.models.VerificationRequest ||
  mongoose.model<IVerificationRequest>('VerificationRequest', schema);