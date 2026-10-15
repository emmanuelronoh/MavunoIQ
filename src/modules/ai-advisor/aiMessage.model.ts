import mongoose, { Schema, type Document, type Model } from 'mongoose';

export interface IAIMessage extends Document {
  _id: mongoose.Types.ObjectId;
  conversation: mongoose.Types.ObjectId;
  role: 'user' | 'assistant' | 'system';
  content: string;
  provider?: string;
  isDemo?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IAIMessage>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: 'AIConversation', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true, maxlength: 20000 },
    provider: { type: String },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

schema.index({ conversation: 1, createdAt: 1 });

export const AIMessage: Model<IAIMessage> =
  mongoose.models.AIMessage || mongoose.model<IAIMessage>('AIMessage', schema);