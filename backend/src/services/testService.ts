import https from 'https';
import http from 'http';
import { Test, Application, Job, Candidate, User } from '../models';
import { QuestionService } from './questionService';
import { TestResponse, TestStatus } from '../types';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';

function makeHttpRequest(
  urlStr: string,
  method: string,
  body: unknown
): Promise<Record<string, unknown> | null> {
  return new Promise((resolve) => {
    const url = new URL(urlStr);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    const bodyStr = JSON.stringify(body);
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); } catch { resolve(null); }
        } else { resolve(null); }
      });
    });
    req.on('error', () => { resolve(null); });
    req.write(bodyStr);
    req.end();
  });
}

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

  static async autoCreateTest(
    applicationId: string,
    candidateId: string,
    jobId: string
  ): Promise<{ testId: string; totalTime: number }> {
    const application = await Application.findById(applicationId);
    if (!application) {
      throw new NotFoundError('Application not found');
    }

    const job = await Job.findById(jobId);
    if (!job) {
      throw new NotFoundError('Job not found');
    }

    const jobDoc = job as unknown as Record<string, unknown>;
    const totalTime = (jobDoc.testConfig as { totalTime?: number } | undefined)?.totalTime ?? 60;

    const testId = this.generateTestId();

    const test = await Test.create({
      testId,
      applicationId,
      candidateId,
      jobId,
      questionIds: [],
      totalTime,
      status: TestStatus.READY,
    });

    const candidate = await Candidate.findOne({ userId: candidateId });
    const candidateDoc = candidate as unknown as Record<string, unknown>;

    let githubUsername = '';
    if (candidateDoc.githubUrl) {
      const url = (candidateDoc.githubUrl as string)
        .replace(/^https?:\/\/github\.com\/?/, '')
        .replace(/^\//, '')
        .split('/')[0];
      if (url) githubUsername = url;
    }

    let githubProfileData = {
      username: githubUsername,
      repositories: [] as Array<{ name: string; description: string; stars: number; language: string }>,
      bio: '',
      name: '',
    };

    console.log('[autoCreateTest] Test created:', { testId, candidateId, jobId, totalTime, githubUsername });

    if (githubUsername) {
      const githubUrl = process.env.GITHUB_PROFILE_URL;
      console.log('[autoCreateTest] Calling GitHub profile API:', githubUrl);
      if (githubUrl) {
        const ghResult = await makeHttpRequest(githubUrl, 'POST', {
          username: githubUsername,
          max_repos: 10,
        });
        console.log('[autoCreateTest] GitHub profile raw result:', JSON.stringify(ghResult, null, 2));
        if (ghResult) {
          githubProfileData = {
            username: githubUsername,
            repositories: (Array.isArray(ghResult.repositories) ? ghResult.repositories : []) as Array<{
              name: string; description: string; stars: number; language: string
            }>,
            bio: (ghResult.bio as string) ?? '',
            name: (ghResult.name as string) ?? '',
          };
        }
        console.log('[autoCreateTest] GitHub profile mapped data:', JSON.stringify(githubProfileData, null, 2));
      }
    } else {
      console.log('[autoCreateTest] No GitHub username found for candidate');
    }

    const user = await User.findById(candidateId);
    const userDoc = user as unknown as Record<string, unknown>;
    const candidateName = `${userDoc.firstName ?? ''} ${userDoc.lastName ?? ''}`.trim()
      || githubProfileData.name || 'Unknown Candidate';

    console.log('[autoCreateTest] Candidate name:', candidateName);

    const interviewUrl = process.env.INTERVIEW_GENERATE_URL;
    let questionIds: string[] = [];

    if (interviewUrl) {
      console.log('[autoCreateTest] Calling interview generate API:', interviewUrl);
      console.log('[autoCreateTest] Interview generate request:', JSON.stringify({
        candidate_name: candidateName,
        github_profile_data: githubProfileData,
        job_description: (jobDoc.description as string)?.substring(0, 300),
      }, null, 2));

      try {
        const generateResult = await makeHttpRequest(interviewUrl, 'POST', {
          candidate_name: candidateName,
          github_profile_data: githubProfileData,
          job_description: jobDoc.description as string,
        });
        console.log('[autoCreateTest] Interview generate raw response:', JSON.stringify(generateResult, null, 2));

        if (generateResult?.questions && Array.isArray(generateResult.questions)) {
          console.log('[autoCreateTest] Questions array found, count:', (generateResult.questions as unknown[]).length);
          const questions = (generateResult.questions as Record<string, unknown>[]).map((q) => {
            const rawType = (q.type as string)?.toLowerCase() ?? 'code';
            const typeMap: Record<string, string> = {
              code: 'code',
              mcq: 'mcq',
              essay: 'essay',
              'system-design': 'system-design',
              github: 'essay',
              jd: 'essay',
            };
            const mappedType = typeMap[rawType] ?? 'code';

            return {
              testId: test._id.toString(),
              type: mappedType,
              difficulty: (q.difficulty as string) ?? 'medium',
              title: (q.title as string) ?? 'Question',
              content: ((q.content ?? q.description) as string) ?? '',
              constraints: Array.isArray(q.constraints) ? q.constraints as string[] : [],
              examples: Array.isArray(q.examples) ? q.examples as Array<{ input: string; output: string; explanation?: string }> : [],
              testCases: Array.isArray(q.testCases) ? q.testCases as Array<{ input: string; expected: string; visible?: boolean }> : [],
              options: Array.isArray(q.options) ? q.options as Array<{ id: string; text: string }> : [],
              starterCode: q.starterCode as Record<string, string> | undefined,
              allowedLanguages: Array.isArray(q.allowedLanguages) ? q.allowedLanguages as string[] : ['python', 'javascript'],
              tags: Array.isArray(q.tags) ? q.tags as string[] : [],
              source: 'llm',
            };
          });

          console.log('[autoCreateTest] Mapped questions, count:', questions.length);
          console.log('[autoCreateTest] Mapped questions preview:', JSON.stringify(questions.map(q => ({ type: q.type, difficulty: q.difficulty, title: q.title?.substring(0, 80) })), null, 2));

          const createdQuestions = await QuestionService.createBulk(questions);
          console.log('[autoCreateTest] Created questions DB IDs:', createdQuestions.map(q => q.id));
          questionIds = createdQuestions.map((q) => q.id);
        } else {
          console.log('[autoCreateTest] generateResult.questions missing or not array:', {
            hasQuestions: 'questions' in (generateResult ?? {}),
            isArray: Array.isArray(generateResult?.questions),
            questionsValue: generateResult?.questions,
          });
        }
      } catch (err) {
        console.error('[autoCreateTest] Interview generate threw error:', err);
      }
    } else {
      console.log('[autoCreateTest] INTERVIEW_GENERATE_URL env var not set');
    }

    console.log('[autoCreateTest] Final questionIds:', questionIds);

    if (questionIds.length > 0) {
      await Test.findByIdAndUpdate(test._id, { questionIds });
    }

    return { testId, totalTime };
  }
}
