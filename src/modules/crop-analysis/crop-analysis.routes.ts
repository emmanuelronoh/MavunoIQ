import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface ICropAnalysis extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  imageKey: string;
  possibleIssue?: string;
  confidence?: number;
  symptoms: string[];
  nextSteps: string[];
  limitations: string;
  model?: string;
  provider: string;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ICropAnalysis>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    imageKey: { type: String, required: true },
    possibleIssue: { type: String },
    confidence: { type: Number, min: 0, max: 1 },
    symptoms: [{ type: String }],
    nextSteps: [{ type: String }],
    limitations: { type: String, required: true },
    model: { type: String },
    provider: { type: String, required: true },
    isDemo: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const CropAnalysis: Model<ICropAnalysis> =
  mongoose.models.CropAnalysis || mongoose.model<ICropAnalysis>('CropAnalysis', schema);