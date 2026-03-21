import { Test, Application } from '../models';
import { QuestionService } from './questionService';
import { TestResponse, TestStatus } from '../types';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';

export class TestService {
  static generateTestId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'TEST-';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static async toResponse(test: InstanceType<typeof Test>): Promise<TestResponse> {
    const doc = test as unknown as Record<string, unknown>;
    return {
      id: doc._id as string,
      testId: doc.testId as string,
      applicationId: doc.applicationId as string,
      candidateId: doc.candidateId as string,
      jobId: doc.jobId as string,
      totalTime: doc.totalTime as number,
      status: doc.status as TestStatus,
      scheduledAt: doc.scheduledAt as Date | undefined,
      startedAt: doc.startedAt as Date | undefined,
      submittedAt: doc.submittedAt as Date | undefined,
      language: doc.language as string | undefined,
      focusLossCount: doc.focusLossCount as number | undefined,
      createdAt: doc.createdAt as Date,
    };
  }

  static async create(data: {
    applicationId: string;
    candidateId: string;
    jobId: string;
    questionIds: string[];
    totalTime: number;
    scheduledAt?: Date;
    language?: string;
  }): Promise<TestResponse> {
    const existing = await Test.findOne({ applicationId: data.applicationId });
    if (existing) {
      throw new ConflictError('Test already exists for this application');
    }

    const application = await Application.findById(data.applicationId);
    if (!application) {
      throw new NotFoundError('Application not found');
    }

    const testId = this.generateTestId();

    const test = await Test.create({
      ...data,
      testId,
      status: TestStatus.READY,
    });

    return this.toResponse(test);
  }

  static async getByTestId(testId: string): Promise<{
    test: TestResponse;
    questions: ReturnType<typeof QuestionService.toResponse>[];
  }> {
    const test = await Test.findOne({ testId });
    if (!test) {
      throw new NotFoundError('Test not found');
    }

    const questionIds = (test as unknown as Record<string, unknown>).questionIds as string[];
    const questions = await QuestionService.getByIds(questionIds);

    return {
      test: await this.toResponse(test),
      questions,
    };
  }

  static async getByCandidate(candidateId: string): Promise<TestResponse[]> {
    const tests = await Test.find({ candidateId }).sort({ createdAt: -1 });
    return Promise.all(tests.map((t) => this.toResponse(t)));
  }

  static async getByApplication(applicationId: string): Promise<TestResponse | null> {
    const test = await Test.findOne({ applicationId });
    if (!test) return null;
    return this.toResponse(test);
  }

  static async start(testId: string, candidateId: string): Promise<TestResponse> {
    const test = await Test.findOne({ testId });
    if (!test) {
      throw new NotFoundError('Test not found');
    }

    if (String((test as unknown as Record<string, unknown>).candidateId) !== candidateId) {
      throw new ForbiddenError('This test does not belong to you');
    }

    if ((test as unknown as Record<string, unknown>).status !== TestStatus.READY && (test as unknown as Record<string, unknown>).status !== TestStatus.PENDING) {
      throw new ConflictError(`Cannot start test in ${(test as unknown as Record<string, unknown>).status} status`);
    }

    const doc = test as unknown as Record<string, unknown>;
    doc.status = TestStatus.IN_PROGRESS;
    doc.startedAt = new Date();
    await test.save();

    return this.toResponse(test);
  }

  static async submit(
    testId: string,
    candidateId: string,
    data: {
      answers: Array<{ questionId: string; answer: string; language?: string; flagged?: boolean; timeSpent?: number }>;
      proctoringLogs?: Array<{ type: 'warning' | 'critical' | 'info'; event: string; details?: string }>;
      focusLossCount?: number;
    }
  ): Promise<TestResponse> {
    const test = await Test.findOne({ testId });
    if (!test) {
      throw new NotFoundError('Test not found');
    }

    const doc = test as unknown as Record<string, unknown>;
    if (String(doc.candidateId) !== candidateId) {
      throw new ForbiddenError('This test does not belong to you');
    }

    if (doc.status !== TestStatus.IN_PROGRESS) {
      throw new ConflictError(`Cannot submit test in ${doc.status} status`);
    }

    doc.answers = data.answers;
    doc.status = TestStatus.SUBMITTED;
    doc.submittedAt = new Date();
    if (data.proctoringLogs) {
      doc.proctoringLogs = data.proctoringLogs.map((log) => ({
        ...log,
        timestamp: new Date(),
      }));
    }
    if (data.focusLossCount !== undefined) {
      doc.focusLossCount = data.focusLossCount;
    }

    await test.save();
    return this.toResponse(test);
  }

  static async getById(id: string): Promise<TestResponse> {
    const test = await Test.findById(id);
    if (!test) {
      throw new NotFoundError('Test not found');
    }
    return this.toResponse(test);
  }
}
