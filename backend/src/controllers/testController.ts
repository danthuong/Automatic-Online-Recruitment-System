import { Request, Response } from 'express';
import { z } from 'zod';
import { TestService } from '../services/testService';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const createTestSchema = z.object({
  body: z.object({
    applicationId: z.string().min(1, 'Application ID is required'),
    candidateId: z.string().min(1, 'Candidate ID is required'),
    jobId: z.string().min(1, 'Job ID is required'),
    questionIds: z.array(z.string()).min(1, 'At least one question is required'),
    totalTime: z.number().int().min(1).default(60),
    scheduledAt: z.string().datetime().optional().transform((v) => (v ? new Date(v) : undefined)),
    language: z.string().optional(),
  }),
});

export const submitTestSchema = z.object({
  params: z.object({ testId: z.string().min(1) }),
  body: z.object({
    answers: z.array(z.object({
      questionId: z.string(),
      answer: z.string(),
      language: z.string().optional(),
      flagged: z.boolean().optional(),
      timeSpent: z.number().int().optional(),
    })),
    proctoringLogs: z.array(z.object({
      type: z.enum(['warning', 'critical', 'info']),
      event: z.string(),
      details: z.string().optional(),
    })).optional(),
    focusLossCount: z.number().int().optional(),
  }),
});

export const create = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const test = await TestService.create(req.body);
    ApiResponse.created(res, test, 'Test created successfully');
  }
);

export const getByTestId = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { test, questions } = await TestService.getByTestId(req.params.testId);
    ApiResponse.success(res, { test, questions });
  }
);

export const getByCandidate = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const candidateId = req.user!.userId;
    const tests = await TestService.getByCandidate(candidateId);
    ApiResponse.success(res, tests);
  }
);

export const getByApplication = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const test = await TestService.getByApplication(req.params.applicationId);
    if (!test) {
      ApiResponse.error(res, 'Test not found', 404);
      return;
    }
    ApiResponse.success(res, test);
  }
);

export const start = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const candidateId = req.user!.userId;
    const test = await TestService.start(req.params.testId, candidateId);
    ApiResponse.success(res, test, 'Test started');
  }
);

export const submit = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const candidateId = req.user!.userId;
    const test = await TestService.submit(req.params.testId, candidateId, req.body);
    ApiResponse.success(res, test, 'Test submitted successfully');
  }
);

export const getById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const test = await TestService.getById(req.params.id);
    ApiResponse.success(res, test);
  }
);
