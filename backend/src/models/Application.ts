import mongoose, { Schema as MongooseSchema } from 'mongoose';

const screeningDetailsSchema = new MongooseSchema(
  {
    skillMatchScore: { type: Number },
    experienceMatchScore: { type: Number },
    overallScore: { type: Number },
    skillGaps: { type: [String] },
    strengths: { type: [String] },
    llmFeedback: { type: String },
    githubAnalysis: {
      repos: { type: Number },
      stars: { type: Number },
      mainLanguages: { type: [String] },
      activity: { type: String },
    },
  },
  { _id: false }
);

const applicationSchema = new MongooseSchema(
  {
    candidateId: {
      type: MongooseSchema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    jobId: {
      type: MongooseSchema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    status: {
      type: String,
      default: 'pending',
    },
    cvScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    screeningFeedback: {
      type: String,
    },
    screeningDetails: {
      type: screeningDetailsSchema,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    screenedAt: {
      type: Date,
    },
    hrNotes: {
      type: String,
    },
    hrDecision: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

applicationSchema.index({ candidateId: 1, jobId: 1 }, { unique: true });
applicationSchema.index({ candidateId: 1 });
applicationSchema.index({ jobId: 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ appliedAt: -1 });

export const Application = mongoose.model('Application', applicationSchema);
