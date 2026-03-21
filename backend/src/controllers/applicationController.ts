import { Request, Response } from 'express';
import { z } from 'zod';
import { ApplicationService } from '../services/applicationService';
import { ApplicationStatus } from '../types';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const createApplicationSchema = z.object({
  body: z.object({
    jobId: z.string().min(1, 'Job ID is required'),
  }),
});

export const updateStatusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    status: z.string(),
    cvScore: z.number().min(0).max(100).optional(),
    screeningFeedback: z.string().optional(),
    screeningDetails: z.object({
      skillMatchScore: z.number().optional(),
      experienceMatchScore: z.number().optional(),
      overallScore: z.number().optional(),
      skillGaps: z.array(z.string()).optional(),
      strengths: z.array(z.string()).optional(),
      llmFeedback: z.string().optional(),
    }).optional(),
    hrNotes: z.string().optional(),
  }),
});

export const screenSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    decision: z.enum(['pass', 'fail']),
    cvScore: z.number().min(0).max(100).optional(),
    screeningFeedback: z.string().optional(),
    hrNotes: z.string().optional(),
  }),
});

export const getAllByJobSchema = z.object({
  query: z.object({
    page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
    limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 20)),
    status: z.string().optional(),
  }),
});

export const getAllByCandidateSchema = z.object({
  query: z.object({
    page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
    limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 20)),
    status: z.string().optional(),
  }),
});

export const create = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const candidateId = req.user!.userId;
    const { jobId } = req.body;
    const application = await ApplicationService.create(candidateId, jobId);
    ApiResponse.created(res, application, 'Application submitted successfully');
  }
);

export const getById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const application = await ApplicationService.getById(req.params.id);
    ApiResponse.success(res, application);
  }
);

export const getByJob = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { page, limit, status } = req.query as Record<string, unknown>;
    const result = await ApplicationService.getByJob(
      req.params.jobId,
      req.user!.userId,
      req.user!.role,
      { page: page as number, limit: limit as number, status: status as ApplicationStatus }
    );
    ApiResponse.paginated(
      res,
      result.applications,
      (page as number) || 1,
      (limit as number) || 20,
      result.total
    );
  }
);

export const getByCandidate = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const candidateId = req.user!.userId;
    const { page, limit, status } = req.query as Record<string, unknown>;
    const result = await ApplicationService.getByCandidate(candidateId, {
      page: page as number,
      limit: limit as number,
      status: status as ApplicationStatus,
    });
    ApiResponse.paginated(
      res,
      result.applications,
      (page as number) || 1,
      (limit as number) || 20,
      result.total
    );
  }
);

export const updateStatus = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { status, cvScore, screeningFeedback, screeningDetails, hrNotes } = req.body;
    const application = await ApplicationService.updateStatus(
      req.params.id,
      status as ApplicationStatus,
      req.user!.role,
      { cvScore, screeningFeedback, screeningDetails, hrNotes }
    );
    ApiResponse.success(res, application, 'Application status updated');
  }
);

export const screen = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const application = await ApplicationService.screen(
      req.params.id,
      req.user!.role,
      req.body
    );
    ApiResponse.success(res, application, 'Screening completed');
  }
);
