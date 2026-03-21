import { Request, Response } from 'express';
import { z } from 'zod';
import https from 'https';
import { ApplicationService } from '../services/applicationService';
import { TestService } from '../services/testService';
import { ApplicationStatus } from '../types';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

const AI_MATCHING_URL = process.env.AI_MATCHING_URL ?? 'http://10.18.151.49:8000/api/matching/cv-jd';
const SCREENING_THRESHOLD = Number(process.env.SCREENING_THRESHOLD ?? 70);

async function callAiMatching(
  candidateId: string,
  jobId: string,
  authToken: string
): Promise<Record<string, unknown> | null> {
  return new Promise((resolve) => {
    const url = new URL(AI_MATCHING_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : (require('http') as typeof import('http'));

    const body = JSON.stringify({ candidateId, jobId });

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': authToken,
      },
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); } catch { resolve(null); }
        } else {
          resolve(null);
        }
      });
    });

    req.on('error', () => { resolve(null); });
    req.write(body);
    req.end();
  });
}

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
    jobId: z.string().optional(),
  }),
});

export const create = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const candidateId = req.user!.userId;
    const { jobId } = req.body;
    const authToken = req.headers.authorization ?? '';
    const aiResult = await callAiMatching(candidateId, jobId, authToken);

    const overallScore = (aiResult?.overallScore as number) ?? 0;
    const initialStatus = overallScore >= SCREENING_THRESHOLD
      ? ApplicationStatus.SCREENING_PASSED
      : ApplicationStatus.SCREENING_FAILED;

    const application = await ApplicationService.create(candidateId, jobId, aiResult, initialStatus);

    let testId: string | undefined;
    let testTotalTime: number | undefined;

    if (initialStatus === ApplicationStatus.SCREENING_PASSED) {
      try {
        const testResult = await TestService.autoCreateTest(application.id, candidateId, jobId);
        testId = testResult.testId;
        testTotalTime = testResult.totalTime;
      } catch (err) {
        console.error('Failed to auto-create test session:', err);
      }
    }

    const response: Record<string, unknown> = {
      id: application.id,
      candidateId: application.candidateId,
      jobId: application.jobId,
      status: application.status,
      cvScore: application.cvScore,
      screeningFeedback: application.screeningFeedback,
      screeningDetails: application.screeningDetails,
      hrNotes: application.hrNotes,
      hrDecision: application.hrDecision,
      appliedAt: application.appliedAt,
      screenedAt: application.screenedAt,
      createdAt: application.createdAt,
      candidate: application.candidate,
      job: application.job,
    };

    if (testId) {
      response.testId = testId;
      response.totalTime = testTotalTime;
    }

    console.log('[create] Final response status:', response.status, 'testId:', testId);

    ApiResponse.created(res, response, 'Application submitted successfully');
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
    const { page, limit, status, jobId } = req.query as Record<string, unknown>;
    const result = await ApplicationService.getByCandidate(candidateId, {
      page: page as number,
      limit: limit as number,
      status: status as ApplicationStatus,
      jobId: jobId as string,
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
