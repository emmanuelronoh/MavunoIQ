import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { KENYAN_COUNTIES } from '../../common/constants/counties.js';
import { PRODUCT_UNITS } from '../../common/constants/units.js';

export interface IMarketPrice extends Document {
  _id: mongoose.Types.ObjectId;
  crop: string;
  market: string;
  county: string;
  priceCents: number;
  currency: 'KES';
  unit: string;
  observedAt: Date;
  source: string;
  isDemo: boolean;
  confidence: number;
  quality: 'actual' | 'estimated' | 'demo';
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IMarketPrice>(
  {
    crop: { type: String, required: true, trim: true, index: true },
    market: { type: String, required: true, trim: true },
    county: { type: String, enum: KENYAN_COUNTIES, required: true, index: true },
    priceCents: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'KES', enum: ['KES'] },
    unit: { type: String, enum: PRODUCT_UNITS, required: true },
    observedAt: { type: Date, required: true, index: true },
    source: { type: String, required: true },
    isDemo: { type: Boolean, default: false },
    confidence: { type: Number, min: 0, max: 1, default: 0.5 },
    quality: { type: String, enum: ['actual', 'estimated', 'demo'], default: 'estimated' },
  },
  { timestamps: true },
);

schema.index({ crop: 1, county: 1, observedAt: -1 });

export const MarketPrice: Model<IMarketPrice> =
  mongoose.models.MarketPrice || mongoose.model<IMarketPrice>('MarketPrice', schema);