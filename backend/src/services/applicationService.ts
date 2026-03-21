import { Application, Job, Candidate, User } from '../models';
import { JobService } from './jobService';
import { ApplicationResponse, ApplicationStatus, UserRole } from '../types';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';

export class ApplicationService {
  static async toResponse(
    app: InstanceType<typeof Application>,
    includeCandidate = false,
    includeJob = false
  ): Promise<ApplicationResponse> {
    const doc = app as unknown as Record<string, unknown>;
    const base: ApplicationResponse = {
      id: doc._id as string,
      candidateId: doc.candidateId as string,
      jobId: doc.jobId as string,
      status: doc.status as ApplicationStatus,
      cvScore: doc.cvScore as number | undefined,
      screeningFeedback: doc.screeningFeedback as string | undefined,
      screeningDetails: doc.screeningDetails as ApplicationResponse['screeningDetails'],
      appliedAt: doc.appliedAt as Date,
      screenedAt: doc.screenedAt as Date | undefined,
      hrNotes: doc.hrNotes as string | undefined,
      hrDecision: doc.hrDecision as 'pending' | 'approved' | 'rejected' | undefined,
      createdAt: doc.createdAt as Date,
    };

    if (includeCandidate) {
      const candidate = await Candidate.findOne({ userId: doc.candidateId });
      if (candidate) {
        const user = await User.findById(doc.candidateId);
        const cd = candidate as unknown as Record<string, unknown>;
        base.candidate = {
          id: cd._id as string,
          userId: cd.userId as string,
          user: user
            ? {
                id: (user as unknown as Record<string, unknown>)._id as string,
                email: (user as unknown as Record<string, unknown>).email as string,
                role: (user as unknown as Record<string, unknown>).role as UserRole,
                firstName: (user as unknown as Record<string, unknown>).firstName as string,
                lastName: (user as unknown as Record<string, unknown>).lastName as string,
                isActive: (user as unknown as Record<string, unknown>).isActive as boolean,
                createdAt: (user as unknown as Record<string, unknown>).createdAt as Date,
              }
            : undefined,
          phone: cd.phone as string | undefined,
          resumeUrl: cd.resumeUrl as string | undefined,
          githubUrl: cd.githubUrl as string | undefined,
          faceImageUrl: cd.faceImageUrl as string | undefined,
          cvUrl: cd.cvUrl as string | undefined,
          parsedCvData: cd.parsedCvData as ApplicationResponse['candidate'] extends undefined ? undefined : NonNullable<ApplicationResponse['candidate']>['parsedCvData'],
          skills: cd.skills as string[],
          experience: cd.experience as number,
          education: cd.education as string | undefined,
          linkedInUrl: cd.linkedInUrl as string | undefined,
          portfolioUrl: cd.portfolioUrl as string | undefined,
          wowScore: cd.wowScore as number | undefined,
          createdAt: cd.createdAt as Date,
        };
      }
    }

    if (includeJob) {
      const job = await Job.findById(doc.jobId);
      if (job) {
        const jd = job as unknown as Record<string, unknown>;
        base.job = {
          id: jd._id as string,
          hrId: jd.hrId as string,
          companyId: jd.companyId as string,
          title: jd.title as string,
          description: jd.description as string,
          summary: jd.summary as string | undefined,
          requiredSkills: jd.requiredSkills as string[],
          preferredSkills: jd.preferredSkills as string[] | undefined,
          experienceLevel: jd.experienceLevel as ApplicationResponse['job'] extends undefined ? 'mid' : NonNullable<ApplicationResponse['job']>['experienceLevel'],
          jobType: jd.jobType as ApplicationResponse['job'] extends undefined ? 'full-time' : NonNullable<ApplicationResponse['job']>['jobType'],
          salary: jd.salary as ApplicationResponse['job'] extends undefined ? undefined : NonNullable<ApplicationResponse['job']>['salary'],
          location: jd.location as string | undefined,
          remote: jd.remote as boolean | undefined,
          hiringCount: jd.hiringCount as number,
          applicationCount: jd.applicationCount as number,
          status: jd.status as ApplicationResponse['job'] extends undefined ? 'draft' : NonNullable<ApplicationResponse['job']>['status'],
          testConfig: jd.testConfig as ApplicationResponse['job'] extends undefined ? { totalTime: 60, codeQuestionCount: 2, essayQuestionCount: 2, mcqQuestionCount: 3, passingScore: 60 } : NonNullable<ApplicationResponse['job']>['testConfig'],
          createdAt: jd.createdAt as Date,
        };
      }
    }

    return base;
  }

  static async create(candidateId: string, jobId: string): Promise<ApplicationResponse> {
    const existing = await Application.findOne({ candidateId, jobId });
    if (existing) {
      throw new ConflictError('You have already applied to this job');
    }

    const job = await Job.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    if ((job as unknown as Record<string, unknown>).status !== 'active') {
      throw new ForbiddenError('This job is not accepting applications');
    }

    const application = await Application.create({
      candidateId,
      jobId,
      status: ApplicationStatus.PENDING,
      appliedAt: new Date(),
    });

    await JobService.incrementApplicationCount(jobId);

    return this.toResponse(application, true, true);
  }

  static async getById(id: string): Promise<ApplicationResponse> {
    const application = await Application.findById(id);
    if (!application) {
      throw new NotFoundError('Application not found');
    }
    return this.toResponse(application, true, true);
  }

  static async getByCandidate(
    candidateId: string,
    params: { page?: number; limit?: number; status?: ApplicationStatus }
  ): Promise<{ applications: ApplicationResponse[]; total: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { candidateId };
    if (params.status) filter.status = params.status;

    const [applications, total] = await Promise.all([
      Application.find(filter).skip(skip).limit(limit).sort({ appliedAt: -1 }),
      Application.countDocuments(filter),
    ]);

    const results = await Promise.all(applications.map((a) => this.toResponse(a, false, true)));
    return { applications: results, total };
  }

  static async getByJob(
    jobId: string,
    requestingUserId: string,
    requestingUserRole: UserRole,
    params: { page?: number; limit?: number; status?: ApplicationStatus }
  ): Promise<{ applications: ApplicationResponse[]; total: number }> {
    const job = await Job.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    if (requestingUserRole !== UserRole.ADMIN && String((job as unknown as Record<string, unknown>).hrId) !== requestingUserId) {
      throw new ForbiddenError('You can only view applications for your own jobs');
    }

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { jobId };
    if (params.status) filter.status = params.status;

    const [applications, total] = await Promise.all([
      Application.find(filter).skip(skip).limit(limit).sort({ appliedAt: -1 }),
      Application.countDocuments(filter),
    ]);

    const results = await Promise.all(applications.map((a) => this.toResponse(a, true, false)));
    return { applications: results, total };
  }

  static async updateStatus(
    id: string,
    status: ApplicationStatus,
    requestingUserRole: UserRole,
    extra?: {
      cvScore?: number;
      screeningFeedback?: string;
      screeningDetails?: Record<string, unknown>;
      hrNotes?: string;
    }
  ): Promise<ApplicationResponse> {
    if (requestingUserRole === UserRole.CANDIDATE) {
      throw new ForbiddenError('Candidates cannot update application status');
    }

    const updates: Record<string, unknown> = { status };
    if (extra?.cvScore !== undefined) updates.cvScore = extra.cvScore;
    if (extra?.screeningFeedback) updates.screeningFeedback = extra.screeningFeedback;
    if (extra?.screeningDetails) updates.screeningDetails = extra.screeningDetails;
    if (extra?.hrNotes) updates.hrNotes = extra.hrNotes;
    if (status === ApplicationStatus.SCREENING_PASSED || status === ApplicationStatus.SCREENING_FAILED) {
      updates.screenedAt = new Date();
    }

    const application = await Application.findByIdAndUpdate(id, updates, { new: true });
    if (!application) {
      throw new NotFoundError('Application not found');
    }

    return this.toResponse(application, true, true);
  }

  static async screen(
    id: string,
    requestingUserRole: UserRole,
    result: {
      decision: 'pass' | 'fail';
      cvScore?: number;
      screeningFeedback?: string;
      hrNotes?: string;
    }
  ): Promise<ApplicationResponse> {
    const status = result.decision === 'pass'
      ? ApplicationStatus.SCREENING_PASSED
      : ApplicationStatus.SCREENING_FAILED;

    return this.updateStatus(id, status, requestingUserRole, {
      cvScore: result.cvScore,
      screeningFeedback: result.screeningFeedback,
      hrNotes: result.hrNotes,
    });
  }
}
