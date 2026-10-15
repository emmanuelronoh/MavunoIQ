import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { KENYAN_COUNTIES } from '../../common/constants/counties.js';
import { VERIFICATION_STATUSES, type VerificationStatus } from '../../common/constants/units.js';

export interface IFarmerProfile extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  displayName: string;
  profileImageUrl?: string;
  phone?: string;
  county: string;
  town?: string;
  farmingExperienceYears?: number;
  farmSize?: number;
  farmSizeUnit?: 'acres' | 'hectares';
  mainCrops: string[];
  farmingMethods: string[];
  verificationStatus: VerificationStatus;
  biography?: string;
  rating: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IFarmerProfile>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    displayName: { type: String, required: true, trim: true, maxlength: 120 },
    profileImageUrl: { type: String },
    phone: { type: String, maxlength: 32 },
    county: { type: String, enum: KENYAN_COUNTIES, required: true, index: true },
    town: { type: String, maxlength: 120 },
    farmingExperienceYears: { type: Number, min: 0, max: 100 },
    farmSize: { type: Number, min: 0 },
    farmSizeUnit: { type: String, enum: ['acres', 'hectares'] },
    mainCrops: [{ type: String, trim: true, maxlength: 80 }],
    farmingMethods: [{ type: String, trim: true, maxlength: 60 }],
    verificationStatus: {
      type: String,
      enum: VERIFICATION_STATUSES,
      default: 'UNVERIFIED',
      index: true,
    },
    biography: { type: String, maxlength: 2000 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

schema.index({ county: 1, verificationStatus: 1 });
schema.index({ mainCrops: 1 });

export const FarmerProfile: Model<IFarmerProfile> =
  mongoose.models.FarmerProfile ||
  mongoose.model<IFarmerProfile>('FarmerProfile', schema);