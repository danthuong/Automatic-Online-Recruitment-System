import mongoose, { Schema as MongooseSchema } from 'mongoose';
import { CandidateStatus } from '../types';

const candidateSchema = new MongooseSchema(
  {
    userId: {
      type: MongooseSchema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    resumeUrl: {
      type: String,
      trim: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    experience: {
      type: Number,
      default: 0,
      min: 0,
    },
    education: {
      type: String,
      trim: true,
    },
    linkedInUrl: {
      type: String,
      trim: true,
    },
    portfolioUrl: {
      type: String,
      trim: true,
    },
    wowScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    applicationStatus: {
      type: String,
      enum: Object.values(CandidateStatus),
      default: CandidateStatus.PENDING,
    },
  },
  {
    timestamps: true,
  }
);

// candidateSchema.index({ userId: 1 });
// candidateSchema.index({ applicationStatus: 1 });
// candidateSchema.index({ wowScore: -1 });

export const Candidate = mongoose.model('Candidate', candidateSchema);
