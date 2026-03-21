import mongoose, { Schema as MongooseSchema } from 'mongoose';

const testAnswerSchema = new MongooseSchema(
  {
    questionId: { type: String, required: true },
    answer: { type: String, required: true },
    language: { type: String },
    flagged: { type: Boolean, default: false },
    timeSpent: { type: Number },
  },
  { _id: false }
);

const proctoringLogSchema = new MongooseSchema(
  {
    timestamp: { type: Date, default: Date.now },
    type: { type: String, enum: ['warning', 'critical', 'info'], required: true },
    event: { type: String, required: true },
    details: { type: String },
  },
  { _id: false }
);

const testSchema = new MongooseSchema(
  {
    testId: {
      type: String,
      required: true,
      unique: true,
    },
    applicationId: {
      type: MongooseSchema.Types.ObjectId,
      ref: 'Application',
      required: true,
    },
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
    questionIds: {
      type: [MongooseSchema.Types.ObjectId],
      ref: 'Question',
      default: [],
    },
    totalTime: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      default: 'pending',
    },
    scheduledAt: {
      type: Date,
    },
    startedAt: {
      type: Date,
    },
    submittedAt: {
      type: Date,
    },
    answers: {
      type: [testAnswerSchema],
    },
    language: {
      type: String,
      default: 'python',
    },
    proctoringLogs: {
      type: [proctoringLogSchema],
      default: [],
    },
    focusLossCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);


testSchema.index({ applicationId: 1 });
testSchema.index({ candidateId: 1 });
testSchema.index({ jobId: 1 });
testSchema.index({ status: 1 });

export const Test = mongoose.model('Test', testSchema);
