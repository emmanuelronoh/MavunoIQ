import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  parent?: mongoose.Types.ObjectId | null;
  iconEmoji?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, maxlength: 500 },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    iconEmoji: { type: String, maxlength: 8 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const Category: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>('Category', schema);