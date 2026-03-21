import mongoose, { Schema as MongooseSchema } from 'mongoose';

const testCaseSchema = new MongooseSchema(
  {
    input: { type: String, required: true },
    expected: { type: String, required: true },
    visible: { type: Boolean, default: false },
  },
  { _id: false }
);

const exampleSchema = new MongooseSchema(
  {
    input: { type: String, required: true },
    output: { type: String, required: true },
    explanation: { type: String },
  },
  { _id: false }
);

const optionSchema = new MongooseSchema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const questionSchema = new MongooseSchema(
  {
    testId: {
      type: MongooseSchema.Types.ObjectId,
      ref: 'Test',
    },
    type: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    constraints: {
      type: [String],
      default: [],
    },
    examples: {
      type: [exampleSchema],
      default: [],
    },
    testCases: {
      type: [testCaseSchema],
      default: [],
    },
    options: {
      type: [optionSchema],
      default: [],
    },
    correctAnswer: {
      type: String,
    },
    starterCode: {
      type: MongooseSchema.Types.Mixed,
    },
    allowedLanguages: {
      type: [String],
      default: ['python', 'javascript'],
    },
    minWords: {
      type: Number,
    },
    maxWords: {
      type: Number,
    },
    rubric: {
      type: MongooseSchema.Types.Mixed,
    },
    tags: {
      type: [String],
      default: [],
    },
    source: {
      type: String,
      default: 'llm',
    },
    llmModel: {
      type: String,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

questionSchema.index({ testId: 1 });
questionSchema.index({ type: 1 });
questionSchema.index({ difficulty: 1 });
questionSchema.index({ tags: 1 });

export const Question = mongoose.model('Question', questionSchema);
