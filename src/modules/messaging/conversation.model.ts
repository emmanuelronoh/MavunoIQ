import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  product?: mongoose.Types.ObjectId;
  order?: mongoose.Types.ObjectId;
  lastMessageAt: Date;
  lastMessagePreview?: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IConversation>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }],
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    order: { type: Schema.Types.ObjectId, ref: 'Order' },
    lastMessageAt: { type: Date, default: Date.now, index: true },
    lastMessagePreview: { type: String, maxlength: 200 },
  },
  { timestamps: true },
);

schema.index({ participants: 1, lastMessageAt: -1 });

export const Conversation: Model<IConversation> =
  mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', schema);