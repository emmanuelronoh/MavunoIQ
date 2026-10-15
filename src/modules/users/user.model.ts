import mongoose, { Schema, type Document, type Model } from 'mongoose';
import { ROLES, type Role } from '../../common/constants/roles.js';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  isActive: boolean;
  deactivatedAt?: Date;
  lastLoginAt?: Date;
  refreshTokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), required: true, index: true },
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, trim: true, maxlength: 32 },
    avatarUrl: { type: String, trim: true },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    isActive: { type: Boolean, default: true },
    deactivatedAt: { type: Date },
    lastLoginAt: { type: Date },
    refreshTokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, isActive: 1 });

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', userSchema);