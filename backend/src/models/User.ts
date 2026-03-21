import mongoose, { Document, Schema } from 'mongoose';
import { IUser, UserRole } from '../types';

export interface UserDocument extends Omit<IUser, '_id'>, Document {}

const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CANDIDATE,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    refreshTokenHash: {
      type: String,
      select: false,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: false,
    },
  },
  {
    timestamps: true,
  }
);


userSchema.index({ companyId: 1 });

export const User = mongoose.model<UserDocument>('User', userSchema);
