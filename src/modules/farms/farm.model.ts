import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { KENYAN_COUNTIES } from '../../common/constants/counties.js';

export interface IFarm extends Document {
  _id: mongoose.Types.ObjectId;
  farmer: mongoose.Types.ObjectId;
  name: string;
  county: string;
  town?: string;
  size?: number;
  sizeUnit?: 'acres' | 'hectares';
  crops: string[];
  farmingMethods: string[];
  coordinates?: { lat: number; lng: number };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IFarm>(
  {
    farmer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    county: { type: String, enum: KENYAN_COUNTIES, required: true, index: true },
    town: { type: String, maxlength: 120 },
    size: { type: Number, min: 0 },
    sizeUnit: { type: String, enum: ['acres', 'hectares'] },
    crops: [{ type: String, trim: true, maxlength: 80 }],
    farmingMethods: [{ type: String, trim: true, maxlength: 60 }],
    coordinates: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

schema.index({ farmer: 1, isActive: 1 });

export const Farm: Model<IFarm> = mongoose.models.Farm || mongoose.model<IFarm>('Farm', schema);