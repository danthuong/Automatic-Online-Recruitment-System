import mongoose, { Schema as MongooseSchema } from 'mongoose';

const companySchema = new MongooseSchema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    logoUrl: {
      type: String,
      trim: true,
    },
    industry: {
      type: String,
      trim: true,
    },
    size: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    foundedYear: {
      type: Number,
    },
    createdBy: {
      type: MongooseSchema.Types.ObjectId,
      ref: 'User',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);


companySchema.index({ location: 1 });
companySchema.index({ isVerified: 1 });

export const Company = mongoose.model('Company', companySchema);
