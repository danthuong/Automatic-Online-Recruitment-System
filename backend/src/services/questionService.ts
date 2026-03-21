import { Question } from '../models';
import { QuestionResponse } from '../types';

export class QuestionService {
  static toResponse(question: InstanceType<typeof Question>, includeAnswer = false): QuestionResponse {
    const doc = question as unknown as Record<string, unknown>;
    const base: QuestionResponse = {
      id: doc._id as string,
      testId: doc.testId as string | undefined,
      type: doc.type as QuestionResponse['type'],
      difficulty: doc.difficulty as QuestionResponse['difficulty'],
      title: doc.title as string,
      content: doc.content as string,
      constraints: doc.constraints as string[] | undefined,
      examples: doc.examples as QuestionResponse['examples'],
      testCases: doc.testCases as QuestionResponse['testCases'],
      options: doc.options as QuestionResponse['options'],
      minWords: doc.minWords as number | undefined,
      maxWords: doc.maxWords as number | undefined,
      allowedLanguages: doc.allowedLanguages as string[] | undefined,
      starterCode: doc.starterCode as Record<string, string> | undefined,
      tags: doc.tags as string[] | undefined,
      source: doc.source as string,
      createdAt: doc.createdAt as Date,
    };

    if (includeAnswer && doc.correctAnswer) {
      return { ...base, correctAnswer: doc.correctAnswer as string } as QuestionResponse & { correctAnswer: string };
    }

    return base;
  }

  static async create(
    data: {
      testId?: string;
      type: string;
      difficulty: string;
      title: string;
      content: string;
      constraints?: string[];
      examples?: Array<{ input: string; output: string; explanation?: string }>;
      testCases?: Array<{ input: string; expected: string; visible?: boolean }>;
      options?: Array<{ id: string; text: string }>;
      correctAnswer?: string;
      starterCode?: Record<string, string>;
      allowedLanguages?: string[];
      minWords?: number;
      maxWords?: number;
      rubric?: Record<string, unknown>;
      tags?: string[];
      source?: string;
      llmModel?: string;
    }
  ): Promise<QuestionResponse> {
    const question = await Question.create({ ...data, usageCount: 0 });
    return this.toResponse(question, true);
  }

  static async createBulk(
    questions: Array<{
      testId?: string;
      type: string;
      difficulty: string;
      title: string;
      content: string;
      constraints?: string[];
      examples?: Array<{ input: string; output: string; explanation?: string }>;
      testCases?: Array<{ input: string; expected: string; visible?: boolean }>;
      options?: Array<{ id: string; text: string }>;
      correctAnswer?: string;
      starterCode?: Record<string, string>;
      allowedLanguages?: string[];
      minWords?: number;
      maxWords?: number;
      rubric?: Record<string, unknown>;
      tags?: string[];
      source?: string;
      llmModel?: string;
    }>
  ): Promise<QuestionResponse[]> {
    const created = await Question.insertMany(questions.map((q) => ({ ...q, usageCount: 0 })));
    return created.map((q) => this.toResponse(q as unknown as InstanceType<typeof Question>, true));
  }

  static async getByTestId(testId: string): Promise<QuestionResponse[]> {
    const questions = await Question.find({ testId });
    return questions.map((q) => this.toResponse(q, false));
  }

  static async getByIds(ids: string[]): Promise<QuestionResponse[]> {
    const questions = await Question.find({ _id: { $in: ids } });
    return questions.map((q) => this.toResponse(q, true));
  }

  static async getByTags(
    tags: string[],
    params: {
      type?: string;
      difficulty?: string;
      limit?: number;
    }
  ): Promise<QuestionResponse[]> {
    const filter: Record<string, unknown> = { tags: { $in: tags } };
    if (params.type) filter.type = params.type;
    if (params.difficulty) filter.difficulty = params.difficulty;

    const questions = await Question.find(filter)
      .limit(params.limit || 10)
      .sort({ usageCount: 1 });
    return questions.map((q) => this.toResponse(q, true));
  }

  static async incrementUsageCount(ids: string[]): Promise<void> {
    await Question.updateMany({ _id: { $in: ids } }, { $inc: { usageCount: 1 } });
  }
}
