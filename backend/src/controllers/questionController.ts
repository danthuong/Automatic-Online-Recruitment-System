import { Request, Response } from 'express';
import { z } from 'zod';
import { QuestionService } from '../services/questionService';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

const questionTypes = ['code', 'mcq', 'essay', 'system-design'] as const;
const difficulties = ['easy', 'medium', 'hard'] as const;

export const createQuestionSchema = z.object({
  body: z.object({
    testId: z.string().optional(),
    type: z.enum(questionTypes),
    difficulty: z.enum(difficulties),
    title: z.string().min(1),
    content: z.string().min(1),
    constraints: z.array(z.string()).optional(),
    examples: z.array(z.object({
      input: z.string(),
      output: z.string(),
      explanation: z.string().optional(),
    })).optional(),
    testCases: z.array(z.object({
      input: z.string(),
      expected: z.string(),
      visible: z.boolean().optional(),
    })).optional(),
    options: z.array(z.object({
      id: z.string(),
      text: z.string(),
    })).optional(),
    correctAnswer: z.string().optional(),
    starterCode: z.record(z.string()).optional(),
    allowedLanguages: z.array(z.string()).optional(),
    minWords: z.number().int().optional(),
    maxWords: z.number().int().optional(),
    rubric: z.record(z.unknown()).optional(),
    tags: z.array(z.string()).optional(),
    source: z.string().default('llm'),
    llmModel: z.string().optional(),
  }),
});

export const createBulkSchema = z.object({
  body: z.object({
    questions: z.array(z.object({
      testId: z.string().optional(),
      type: z.enum(questionTypes),
      difficulty: z.enum(difficulties),
      title: z.string().min(1),
      content: z.string().min(1),
      constraints: z.array(z.string()).optional(),
      examples: z.array(z.object({
        input: z.string(),
        output: z.string(),
        explanation: z.string().optional(),
      })).optional(),
      testCases: z.array(z.object({
        input: z.string(),
        expected: z.string(),
        visible: z.boolean().optional(),
      })).optional(),
      options: z.array(z.object({
        id: z.string(),
        text: z.string(),
      })).optional(),
      correctAnswer: z.string().optional(),
      starterCode: z.record(z.string()).optional(),
      allowedLanguages: z.array(z.string()).optional(),
      minWords: z.number().int().optional(),
      maxWords: z.number().int().optional(),
      rubric: z.record(z.unknown()).optional(),
      tags: z.array(z.string()).optional(),
      source: z.string().default('llm'),
      llmModel: z.string().optional(),
    })).min(1),
  }),
});

export const getByTagsSchema = z.object({
  query: z.object({
    tags: z.string().transform((v) => v.split(',')),
    type: z.string().optional(),
    difficulty: z.string().optional(),
    limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 10)),
  }),
});

export const create = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const question = await QuestionService.create(req.body);
    ApiResponse.created(res, question, 'Question created successfully');
  }
);

export const createBulk = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const questions = await QuestionService.createBulk(req.body.questions);
    ApiResponse.created(res, questions, `${questions.length} questions created successfully`);
  }
);

export const getByIds = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const ids = (req.query.ids as string)?.split(',').filter(Boolean) || [];
    if (ids.length === 0) {
      ApiResponse.success(res, []);
      return;
    }
    const questions = await QuestionService.getByIds(ids);
    ApiResponse.success(res, questions);
  }
);

export const getByTags = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { tags, type, difficulty, limit } = req.query as unknown as {
      tags: string[];
      type?: string;
      difficulty?: string;
      limit?: number;
    };
    const questions = await QuestionService.getByTags(tags, { type, difficulty, limit });
    ApiResponse.success(res, questions as unknown as Record<string, unknown>[]);
  }
);

export const getByTestId = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const questions = await QuestionService.getByTestId(req.params.testId);
    ApiResponse.success(res, questions);
  }
);
