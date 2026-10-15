import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IAIConversation extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IAIConversation>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, maxlength: 200, default: 'New conversation' },
  },
  { timestamps: true },
);

schema.index({ user: 1, updatedAt: -1 });

export const AIConversation: Model<IAIConversation> =
  mongoose.models.AIConversation || mongoose.model<IAIConversation>('AIConversation', schema);