import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { KENYAN_COUNTIES } from '../../common/constants/counties.js';

export interface IDemandForecast extends Document {
  _id: mongoose.Types.ObjectId;
  crop: string;
  county: string;
  periodStart: Date;
  periodEnd: Date;
  demandScore: number;
  supplyScore: number;
  gapScore: number;
  notes?: string;
  isDemo: boolean;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IDemandForecast>(
  {
    crop: { type: String, required: true, index: true },
    county: { type: String, enum: KENYAN_COUNTIES, required: true, index: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    demandScore: { type: Number, min: 0, max: 1 },
    supplyScore: { type: Number, min: 0, max: 1 },
    gapScore: { type: Number, min: -1, max: 1 },
    notes: { type: String, maxlength: 2000 },
    isDemo: { type: Boolean, default: false },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const DemandForecast: Model<IDemandForecast> =
  mongoose.models.DemandForecast || mongoose.model<IDemandForecast>('DemandForecast', schema);