import { Request, Response } from 'express';
import { z } from 'zod';
import { JobService } from '../services/jobService';
import { JobStatus } from '../types';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const createJobSchema = z.object({
  body: z.object({
    companyId: z.string().min(1, 'Company ID is required'),
    title: z.string().min(1, 'Job title is required').max(200),
    description: z.string().min(1, 'Job description is required'),
    summary: z.string().optional(),
    requiredSkills: z.array(z.string()).default([]),
    preferredSkills: z.array(z.string()).default([]),
    experienceLevel: z.string().optional(),
    jobType: z.string().optional(),
    salary: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      currency: z.string().optional(),
      isNegotiable: z.boolean().optional(),
    }).optional(),
    location: z.string().optional(),
    remote: z.boolean().optional(),
    hiringCount: z.number().int().min(1).optional(),
    expiresAt: z.string().datetime().optional().transform((v) => (v ? new Date(v) : undefined)),
    testConfig: z.object({
      totalTime: z.number().int().min(1).default(60),
      codeQuestionCount: z.number().int().min(0).optional(),
      essayQuestionCount: z.number().int().min(0).optional(),
      mcqQuestionCount: z.number().int().min(0).optional(),
      passingScore: z.number().min(0).max(100).optional(),
    }).optional(),
  }),
});

export const updateJobSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().min(1).optional(),
    summary: z.string().optional(),
    requiredSkills: z.array(z.string()).optional(),
    preferredSkills: z.array(z.string()).optional(),
    experienceLevel: z.string().optional(),
    jobType: z.string().optional(),
    salary: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      currency: z.string().optional(),
      isNegotiable: z.boolean().optional(),
    }).optional(),
    location: z.string().optional(),
    remote: z.boolean().optional(),
    hiringCount: z.number().int().min(1).optional(),
    status: z.string().optional(),
    expiresAt: z.string().datetime().optional().transform((v) => (v ? new Date(v) : undefined)),
    testConfig: z.object({
      totalTime: z.number().int().min(1).optional(),
      codeQuestionCount: z.number().int().min(0).optional(),
      essayQuestionCount: z.number().int().min(0).optional(),
      mcqQuestionCount: z.number().int().min(0).optional(),
      passingScore: z.number().min(0).max(100).optional(),
    }).optional(),
  }),
});

export const getAllSchema = z.object({
  query: z.object({
    page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
    limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 20)),
    status: z.string().optional(),
    companyId: z.string().optional(),
    hrId: z.string().optional(),
    search: z.string().optional(),
    requiredSkills: z.string().optional().transform((v) => (v ? v.split(',') : undefined)),
    experienceLevel: z.string().optional(),
    location: z.string().optional(),
    remote: z.string().optional().transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  }),
});

export const create = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const job = await JobService.create({
      hrId: req.user!.userId,
      ...req.body,
    });
    ApiResponse.created(res, job, 'Job created successfully');
  }
);

export const getAll = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await JobService.getAll(req.query as Record<string, unknown>);
    ApiResponse.paginated(
      res,
      result.jobs,
      (req.query.page as unknown as number) || 1,
      (req.query.limit as unknown as number) || 20,
      result.total
    );
  }
);

export const getById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const job = await JobService.getById(req.params.id);
    ApiResponse.success(res, job);
  }
);

export const update = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const job = await JobService.update(
      req.params.id,
      req.user!.userId,
      req.user!.role,
      req.body
    );
    ApiResponse.success(res, job, 'Job updated successfully');
  }
);

export const updateStatus = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { status } = req.body;
    const job = await JobService.updateStatus(
      req.params.id,
      status as JobStatus,
      req.user!.userId,
      req.user!.role
    );
    ApiResponse.success(res, job, 'Job status updated');
  }
);

export const getByCompany = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { page, limit, status } = req.query as Record<string, unknown>;
    const result = await JobService.getJobsByCompany(
      req.params.companyId,
      {
        page: page as number,
        limit: limit as number,
        status: status as JobStatus,
      }
    );
    ApiResponse.paginated(
      res,
      result.jobs,
      (page as number) || 1,
      (limit as number) || 20,
      result.total
    );
  }
);
