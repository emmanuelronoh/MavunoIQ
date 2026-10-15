import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IRefreshToken extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  tokenHash: string;
  family: string;
  replacedBy?: string;
  revokedAt?: Date;
  expiresAt: Date;
  userAgent?: string;
  ip?: string;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, index: true },
    family: { type: String, required: true, index: true },
    replacedBy: { type: String },
    revokedAt: { type: Date },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    userAgent: { type: String },
    ip: { type: String },
  },
  { timestamps: true },
);

refreshTokenSchema.index({ user: 1, family: 1 });

export const RefreshToken: Model<IRefreshToken> =
  mongoose.models.RefreshToken ||
  mongoose.model<IRefreshToken>('RefreshToken', refreshTokenSchema);