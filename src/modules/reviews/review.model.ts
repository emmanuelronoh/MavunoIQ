import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IReview extends Document {
  _id: mongoose.Types.ObjectId;
  reviewer: mongoose.Types.ObjectId;
  reviewed: mongoose.Types.ObjectId;
  order: mongoose.Types.ObjectId;
  rating: number;
  text?: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IReview>(
  {
    reviewer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reviewed: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text: { type: String, maxlength: 2000 },
  },
  { timestamps: true },
);

schema.index({ reviewer: 1, order: 1 }, { unique: true });

export const Review: Model<IReview> =
  mongoose.models.Review || mongoose.model<IReview>('Review', schema);