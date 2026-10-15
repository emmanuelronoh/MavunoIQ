import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { KENYAN_COUNTIES } from '../../common/constants/counties.js';
import {
  PRODUCT_UNITS,
  QUALITY_GRADES,
  FARMING_METHODS,
  PRODUCT_STATUSES,
  type ProductStatus,
} from '../../common/constants/units.js';

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  farmer: mongoose.Types.ObjectId;
  farm?: mongoose.Types.ObjectId;
  name: string;
  category: mongoose.Types.ObjectId;
  description: string;
  images: string[];
  quantityAvailable: number;
  quantityReserved: number;
  unit: string;
  priceCents: number;
  currency: 'KES';
  minimumOrderQuantity: number;
  qualityGrade: string;
  farmingMethod: string;
  county: string;
  town?: string;
  harvestDate?: Date;
  expectedHarvestDate?: Date;
  status: ProductStatus;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IProduct>(
  {
    farmer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    farm: { type: Schema.Types.ObjectId, ref: 'Farm', index: true },
    name: { type: String, required: true, trim: true, maxlength: 200, index: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    description: { type: String, required: true, maxlength: 4000 },
    images: [{ type: String, maxlength: 500 }],
    quantityAvailable: { type: Number, required: true, min: 0 },
    quantityReserved: { type: Number, default: 0, min: 0 },
    unit: { type: String, enum: PRODUCT_UNITS, required: true },
    priceCents: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'KES', enum: ['KES'] },
    minimumOrderQuantity: { type: Number, required: true, min: 1 },
    qualityGrade: { type: String, enum: QUALITY_GRADES, default: 'ungraded' },
    farmingMethod: { type: String, enum: FARMING_METHODS, required: true },
    county: { type: String, enum: KENYAN_COUNTIES, required: true, index: true },
    town: { type: String, maxlength: 120 },
    harvestDate: { type: Date },
    expectedHarvestDate: { type: Date },
    status: { type: String, enum: PRODUCT_STATUSES, default: 'PUBLISHED', index: true },
    isVerified: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

schema.index({ name: 'text', description: 'text' });
schema.index({ county: 1, category: 1, status: 1 });
schema.index({ priceCents: 1 });
schema.index({ createdAt: -1 });

export const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>('Product', schema);