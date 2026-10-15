import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { KENYAN_COUNTIES } from '../../common/constants/counties.js';
import { BUYER_TYPES, type BuyerType, VERIFICATION_STATUSES, type VerificationStatus } from '../../common/constants/units.js';

export interface IBuyerProfile extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  displayName: string;
  businessName?: string;
  buyerType: BuyerType;
  county: string;
  town?: string;
  businessDescription?: string;
  contactPreference: 'in_app' | 'email' | 'phone';
  phone?: string;
  profileImageUrl?: string;
  verificationStatus: VerificationStatus;
  rating: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IBuyerProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    displayName: { type: String, required: true, trim: true, maxlength: 120 },
    businessName: { type: String, trim: true, maxlength: 200 },
    buyerType: { type: String, enum: BUYER_TYPES, required: true, index: true },
    county: { type: String, enum: KENYAN_COUNTIES, required: true, index: true },
    town: { type: String, maxlength: 120 },
    businessDescription: { type: String, maxlength: 2000 },
    contactPreference: { type: String, enum: ['in_app', 'email', 'phone'], default: 'in_app' },
    phone: { type: String, maxlength: 32 },
    profileImageUrl: { type: String },
    verificationStatus: {
      type: String,
      enum: VERIFICATION_STATUSES,
      default: 'UNVERIFIED',
      index: true,
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

schema.index({ county: 1, buyerType: 1 });

export const BuyerProfile: Model<IBuyerProfile> =
  mongoose.models.BuyerProfile ||
  mongoose.model<IBuyerProfile>('BuyerProfile', schema);