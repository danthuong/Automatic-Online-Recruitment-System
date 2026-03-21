import mongoose, { Schema as MongooseSchema } from 'mongoose';

const salarySchema = new MongooseSchema(
  {
    min: { type: Number },
    max: { type: Number },
    currency: { type: String, default: 'USD' },
    isNegotiable: { type: Boolean, default: false },
  },
  { _id: false }
);

const testConfigSchema = new MongooseSchema(
  {
    totalTime: { type: Number, required: true },
    codeQuestionCount: { type: Number, default: 2 },
    essayQuestionCount: { type: Number, default: 2 },
    mcqQuestionCount: { type: Number, default: 3 },
    passingScore: { type: Number, default: 60 },
  },
  { _id: false }
);

const jobSchema = new MongooseSchema(
  {
    hrId: {
      type: MongooseSchema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    companyId: {
      type: MongooseSchema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      trim: true,
    },
    requiredSkills: {
      type: [String],
      default: [],
    },
    preferredSkills: {
      type: [String],
      default: [],
    },
    experienceLevel: {
      type: String,
      default: 'mid',
    },
    jobType: {
      type: String,
      default: 'full-time',
    },
    salary: {
      type: salarySchema,
    },
    location: {
      type: String,
      trim: true,
    },
    remote: {
      type: Boolean,
      default: false,
    },
    hiringCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    applicationCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      default: 'draft',
    },
    expiresAt: {
      type: Date,
    },
    testConfig: {
      type: testConfigSchema,
    },
  },
  {
    timestamps: true,
  }
);

jobSchema.index({ hrId: 1 });
jobSchema.index({ companyId: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ requiredSkills: 1 });
jobSchema.index({ createdAt: -1 });

export const Job = mongoose.model('Job', jobSchema);
