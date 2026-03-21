import { Job, Company } from '../models';
import { JobResponse, JobStatus, UserRole } from '../types';
import { NotFoundError, ForbiddenError } from '../utils/errors';

export class JobService {
  static async toResponse(job: InstanceType<typeof Job>, includeCompany = false): Promise<JobResponse> {
    const doc = job as unknown as Record<string, unknown>;
    const base: JobResponse = {
      id: doc._id as string,
      hrId: doc.hrId as string,
      companyId: doc.companyId as string,
      title: doc.title as string,
      description: doc.description as string,
      summary: doc.summary as string | undefined,
      requiredSkills: doc.requiredSkills as string[],
      preferredSkills: doc.preferredSkills as string[] | undefined,
      experienceLevel: doc.experienceLevel as JobResponse['experienceLevel'],
      jobType: doc.jobType as JobResponse['jobType'],
      salary: doc.salary as JobResponse['salary'],
      location: doc.location as string | undefined,
      remote: doc.remote as boolean | undefined,
      hiringCount: doc.hiringCount as number,
      applicationCount: doc.applicationCount as number,
      status: doc.status as JobStatus,
      expiresAt: doc.expiresAt as Date | undefined,
      testConfig: doc.testConfig as JobResponse['testConfig'],
      createdAt: doc.createdAt as Date,
    };

    if (includeCompany) {
      const company = await Company.findById(doc.companyId);
      if (company) {
        const c = company as unknown as Record<string, unknown>;
        base.company = {
          id: c._id as string,
          name: c.name as string,
          description: c.description as string | undefined,
          website: c.website as string | undefined,
          logoUrl: c.logoUrl as string | undefined,
          industry: c.industry as string | undefined,
          size: c.size as string | undefined,
          location: c.location as string | undefined,
          foundedYear: c.foundedYear as number | undefined,
          createdBy: c.createdBy as string,
          isVerified: c.isVerified as boolean,
          createdAt: c.createdAt as Date,
        };
      }
    }

    return base;
  }

  static async create(data: {
    hrId: string;
    companyId: string;
    title: string;
    description: string;
    summary?: string;
    requiredSkills?: string[];
    preferredSkills?: string[];
    experienceLevel?: string;
    jobType?: string;
    salary?: { min?: number; max?: number; currency?: string; isNegotiable?: boolean };
    location?: string;
    remote?: boolean;
    hiringCount?: number;
    status?: JobStatus;
    expiresAt?: Date;
    testConfig?: {
      totalTime: number;
      codeQuestionCount?: number;
      essayQuestionCount?: number;
      mcqQuestionCount?: number;
      passingScore?: number;
    };
  }): Promise<JobResponse> {
    const company = await Company.findById(data.companyId);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    const job = await Job.create({
      ...data,
      status: data.status ?? JobStatus.DRAFT,
      applicationCount: 0,
    });

    return this.toResponse(job, true);
  }

  static async getAll(params: {
    page?: number;
    limit?: number;
    status?: JobStatus;
    companyId?: string;
    hrId?: string;
    search?: string;
    requiredSkills?: string[];
    experienceLevel?: string;
    location?: string;
    remote?: boolean;
  }): Promise<{ jobs: JobResponse[]; total: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (params.status) filter.status = params.status;
    if (params.companyId) filter.companyId = params.companyId;
    if (params.hrId) filter.hrId = params.hrId;
    if (params.experienceLevel) filter.experienceLevel = params.experienceLevel;
    if (params.location) filter.location = { $regex: params.location, $options: 'i' };
    if (params.remote !== undefined) filter.remote = params.remote;
    if (params.requiredSkills && params.requiredSkills.length > 0) {
      filter.requiredSkills = { $all: params.requiredSkills };
    }
    if (params.search) {
      filter.$text = { $search: params.search };
    }

    const [jobs, total] = await Promise.all([
      Job.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Job.countDocuments(filter),
    ]);

    const jobsWithCompany = await Promise.all(jobs.map((j) => this.toResponse(j, true)));

    return { jobs: jobsWithCompany, total };
  }

  static async getById(id: string): Promise<JobResponse> {
    const job = await Job.findById(id);
    if (!job) {
      throw new NotFoundError('Job not found');
    }
    return this.toResponse(job, true);
  }

  static async update(
    id: string,
    requestingUserId: string,
    requestingUserRole: UserRole,
    updates: Partial<{
      title: string;
      description: string;
      summary: string;
      requiredSkills: string[];
      preferredSkills: string[];
      experienceLevel: string;
      jobType: string;
      salary: { min?: number; max?: number; currency?: string; isNegotiable?: boolean };
      location: string;
      remote: boolean;
      hiringCount: number;
      status: JobStatus;
      expiresAt: Date;
      testConfig: {
        totalTime: number;
        codeQuestionCount?: number;
        essayQuestionCount?: number;
        mcqQuestionCount?: number;
        passingScore?: number;
      };
    }>
  ): Promise<JobResponse> {
    const job = await Job.findById(id);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    if (requestingUserRole !== UserRole.ADMIN && String((job as unknown as Record<string, unknown>).hrId) !== requestingUserId) {
      throw new ForbiddenError('You can only update your own jobs');
    }

    if (updates.status && updates.status === JobStatus.ACTIVE) {
      if (!job.title || !job.description || job.requiredSkills.length === 0) {
        throw new ForbiddenError('Job must have title, description, and required skills before publishing');
      }
    }

    const updated = await Job.findByIdAndUpdate(id, updates, { new: true });
    return this.toResponse(updated!, true);
  }

  static async updateStatus(
    id: string,
    status: JobStatus,
    requestingUserId: string,
    requestingUserRole: UserRole
  ): Promise<JobResponse> {
    return this.update(id, requestingUserId, requestingUserRole, { status });
  }

  static async incrementApplicationCount(id: string): Promise<void> {
    await Job.findByIdAndUpdate(id, { $inc: { applicationCount: 1 } });
  }

  static async getJobsByCompany(
    companyId: string,
    params: { page?: number; limit?: number; status?: JobStatus }
  ): Promise<{ jobs: JobResponse[]; total: number }> {
    return this.getAll({ ...params, companyId });
  }
}
