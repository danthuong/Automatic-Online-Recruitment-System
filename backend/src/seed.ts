import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from './models/User';
import { Candidate } from './models/Candidate';
import { Company } from './models/Company';
import { Job } from './models/Job';
import { Application } from './models/Application';
import { Question } from './models/Question';
import { Test } from './models/Test';
import { UserRole, JobStatus, ExperienceLevel, JobType, ApplicationStatus, QuestionType, Difficulty, TestStatus } from './types';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lotus_hack';

const seed = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    await User.deleteMany({});
    await Candidate.deleteMany({});
    await Company.deleteMany({});
    await Job.deleteMany({});
    await Application.deleteMany({});
    await Question.deleteMany({});
    await Test.deleteMany({});
    console.log('Cleared existing data');

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

    // --- Users (create first so we have ObjectIds for createdBy) ---
    const admin = await User.create({
      email: 'admin@lotushack.com',
      password: await bcrypt.hash('Admin123!', saltRounds),
      role: UserRole.ADMIN,
      firstName: 'System',
      lastName: 'Admin',
    });

    const hrUser = await User.create({
      email: 'hr@lotushack.com',
      password: await bcrypt.hash('Hr123456!', saltRounds),
      role: UserRole.HR,
      firstName: 'Nguyen',
      lastName: 'HR Manager',
    });

    const hr2User = await User.create({
      email: 'hr2@dataflow.ai',
      password: await bcrypt.hash('Hr123456!', saltRounds),
      role: UserRole.HR,
      firstName: 'Tran',
      lastName: 'Data HR',
    });

    // --- Companies ---
    const companies = await Company.insertMany([
      {
        name: 'TechCorp Vietnam',
        description: 'Leading software development company specializing in enterprise solutions.',
        website: 'https://techcorp.vn',
        industry: 'Technology',
        size: '201-500',
        location: 'Ho Chi Minh City, Vietnam',
        foundedYear: 2018,
        createdBy: hrUser._id,
        isVerified: true,
      },
      {
        name: 'DataFlow AI',
        description: 'AI-powered data analytics startup.',
        website: 'https://dataflow.ai',
        industry: 'Artificial Intelligence',
        size: '11-50',
        location: 'Hanoi, Vietnam',
        foundedYear: 2021,
        createdBy: hr2User._id,
        isVerified: true,
      },
      {
        name: 'CloudNine Systems',
        description: 'Cloud infrastructure and DevOps consulting.',
        website: 'https://cloudnine.io',
        industry: 'Cloud Computing',
        size: '51-200',
        location: 'Da Nang, Vietnam',
        foundedYear: 2020,
        createdBy: hrUser._id,
        isVerified: false,
      },
    ]);
    console.log(`Created ${companies.length} companies`);

    const candidates = [];
    const candidateData = [
      { email: 'candidate1@test.com', password: 'Candidate123!', firstName: 'John', lastName: 'Doe', skills: ['JavaScript', 'React', 'Node.js', 'TypeScript'], experience: 3, education: 'FPT University', githubUrl: 'https://github.com/johndoe' },
      { email: 'candidate2@test.com', password: 'Candidate123!', firstName: 'Jane', lastName: 'Smith', skills: ['Python', 'Django', 'PostgreSQL', 'Docker'], experience: 5, education: 'UIT', githubUrl: 'https://github.com/janesmith' },
      { email: 'candidate3@test.com', password: 'Candidate123!', firstName: 'Bob', lastName: 'Johnson', skills: ['Java', 'Spring Boot', 'MongoDB', 'Kubernetes'], experience: 2, education: 'HCMUS', githubUrl: 'https://github.com/bobjohnson' },
      { email: 'candidate4@test.com', password: 'Candidate123!', firstName: 'Alice', lastName: 'Wonder', skills: ['Go', 'gRPC', 'Redis', 'AWS'], experience: 4, education: 'VNU', githubUrl: 'https://github.com/alicewonder' },
      { email: 'candidate5@test.com', password: 'Candidate123!', firstName: 'Charlie', lastName: 'Brown', skills: ['C++', 'Rust', 'Linux', 'Networking'], experience: 6, education: 'PTIT', githubUrl: 'https://github.com/charliebrown' },
    ];

    for (const cd of candidateData) {
      const user = await User.create({
        email: cd.email,
        password: await bcrypt.hash(cd.password, saltRounds),
        role: UserRole.CANDIDATE,
        firstName: cd.firstName,
        lastName: cd.lastName,
      });

      const candidate = await Candidate.create({
        userId: user._id,
        skills: cd.skills,
        experience: cd.experience,
        education: cd.education,
        githubUrl: cd.githubUrl,
        wowScore: Math.floor(Math.random() * 40) + 60,
        parsedCvData: {
          skills: cd.skills,
          experience_years: cd.experience,
          education: cd.education,
          projects: [],
          summary: `${cd.firstName} ${cd.lastName} is a ${cd.experience}-year experienced developer with expertise in ${cd.skills.slice(0, 3).join(', ')} and more.`,
        },
      });

      candidates.push({ user, candidate });
      console.log(`Created candidate: ${cd.email} (${cd.skills.join(', ')})`);
    }

    console.log(`Created admin: ${admin.email}`);
    console.log(`Created HR: ${hrUser.email} (${companies[0].name})`);
    console.log(`Created HR: ${hr2User.email} (${companies[1].name})`);

    await User.updateOne({ _id: hrUser._id }, { companyId: companies[0]._id });
    await User.updateOne({ _id: hr2User._id }, { companyId: companies[1]._id });

    // --- Jobs ---
    const jobs = await Job.insertMany([
      {
        hrId: hrUser._id,
        companyId: companies[0]._id,
        title: 'Senior Frontend Developer',
        description: 'We are looking for an experienced frontend developer to build modern web applications using React and TypeScript.',
        summary: 'Build modern web apps with React, TypeScript, and TailwindCSS.',
        requiredSkills: ['React', 'TypeScript', 'JavaScript', 'CSS'],
        preferredSkills: ['Next.js', 'GraphQL', 'Testing'],
        experienceLevel: ExperienceLevel.SENIOR,
        jobType: JobType.FULL_TIME,
        salary: { min: 2000, max: 4000, currency: 'USD', isNegotiable: true },
        location: 'Ho Chi Minh City',
        remote: true,
        hiringCount: 2,
        applicationCount: 0,
        status: JobStatus.ACTIVE,
        testConfig: { totalTime: 90, codeQuestionCount: 2, essayQuestionCount: 2, mcqQuestionCount: 3, passingScore: 70 },
      },
      {
        hrId: hrUser._id,
        companyId: companies[0]._id,
        title: 'Backend Engineer (Python/Django)',
        description: 'Join our team to build scalable backend services and APIs.',
        summary: 'Build and maintain backend services with Python and Django.',
        requiredSkills: ['Python', 'Django', 'PostgreSQL', 'REST API'],
        preferredSkills: ['Docker', 'Kubernetes', 'Redis'],
        experienceLevel: ExperienceLevel.MID,
        jobType: JobType.FULL_TIME,
        salary: { min: 1500, max: 3000, currency: 'USD', isNegotiable: true },
        location: 'Ho Chi Minh City',
        remote: true,
        hiringCount: 1,
        applicationCount: 0,
        status: JobStatus.ACTIVE,
        testConfig: { totalTime: 60, codeQuestionCount: 2, essayQuestionCount: 1, mcqQuestionCount: 5, passingScore: 65 },
      },
      {
        hrId: hr2User._id,
        companyId: companies[1]._id,
        title: 'AI/ML Engineer',
        description: 'Develop and deploy machine learning models for our AI products.',
        summary: 'Work on cutting-edge AI/ML projects.',
        requiredSkills: ['Python', 'Machine Learning', 'Deep Learning', 'SQL'],
        preferredSkills: ['PyTorch', 'TensorFlow', 'LLM'],
        experienceLevel: ExperienceLevel.SENIOR,
        jobType: JobType.FULL_TIME,
        salary: { min: 3000, max: 6000, currency: 'USD', isNegotiable: false },
        location: 'Hanoi',
        remote: false,
        hiringCount: 1,
        applicationCount: 0,
        status: JobStatus.ACTIVE,
        testConfig: { totalTime: 120, codeQuestionCount: 3, essayQuestionCount: 2, mcqQuestionCount: 5, passingScore: 75 },
      },
      {
        hrId: hr2User._id,
        companyId: companies[1]._id,
        title: 'DevOps Engineer',
        description: 'Manage CI/CD pipelines and cloud infrastructure.',
        summary: 'Build and maintain DevOps pipelines.',
        requiredSkills: ['Docker', 'Kubernetes', 'CI/CD', 'Linux'],
        preferredSkills: ['AWS', 'Terraform', 'Monitoring'],
        experienceLevel: ExperienceLevel.MID,
        jobType: JobType.FULL_TIME,
        salary: { min: 1800, max: 3500, currency: 'USD', isNegotiable: true },
        location: 'Hanoi',
        remote: true,
        hiringCount: 1,
        applicationCount: 0,
        status: JobStatus.DRAFT,
        testConfig: { totalTime: 60, codeQuestionCount: 1, essayQuestionCount: 2, mcqQuestionCount: 4, passingScore: 60 },
      },
    ]);
    console.log(`Created ${jobs.length} jobs`);

    // --- Applications ---
    const applications = await Application.insertMany([
      {
        candidateId: candidates[0].user._id,
        jobId: jobs[0]._id,
        status: ApplicationStatus.PENDING,
        appliedAt: new Date(),
      },
      {
        candidateId: candidates[1].user._id,
        jobId: jobs[0]._id,
        status: ApplicationStatus.SCREENING,
        appliedAt: new Date(Date.now() - 86400000),
        cvScore: 78,
        screeningFeedback: 'Good React experience, strong TypeScript skills.',
        screeningDetails: {
          skillMatchScore: 85,
          experienceMatchScore: 70,
          overallScore: 78,
          skillGaps: ['Testing', 'GraphQL'],
          strengths: ['React', 'TypeScript', 'Node.js'],
          llmFeedback: 'Strong candidate with relevant frontend experience.',
        },
      },
      {
        candidateId: candidates[2].user._id,
        jobId: jobs[1]._id,
        status: ApplicationStatus.SCREENING_PASSED,
        appliedAt: new Date(Date.now() - 172800000),
        cvScore: 82,
        screeningFeedback: 'Excellent backend experience, good database skills.',
        screenedAt: new Date(),
        screeningDetails: {
          skillMatchScore: 88,
          experienceMatchScore: 75,
          overallScore: 82,
          skillGaps: ['Docker', 'Kubernetes'],
          strengths: ['Python', 'Django', 'PostgreSQL'],
          llmFeedback: 'Highly qualified candidate for backend role.',
        },
      },
      {
        candidateId: candidates[3].user._id,
        jobId: jobs[2]._id,
        status: ApplicationStatus.SCREENING,
        appliedAt: new Date(Date.now() - 43200000),
        cvScore: 65,
        screeningFeedback: 'Moderate experience, needs more ML depth.',
      },
    ]);
    console.log(`Created ${applications.length} applications`);

    // --- Questions (LLM-generated) ---
    const questions = await Question.insertMany([
      {
        type: QuestionType.CODE,
        difficulty: Difficulty.EASY,
        title: 'Two Sum',
        content: 'Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target.',
        constraints: ['2 <= nums.length <= 10^4', '-10^9 <= nums[i] <= 10^9'],
        examples: [
          { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'nums[0] + nums[1] == 9' },
          { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
        ],
        testCases: [
          { input: 'nums = [2,7,11,15], target = 9', expected: '[0,1]', visible: true },
          { input: 'nums = [3,2,4], target = 6', expected: '[1,2]', visible: true },
          { input: 'nums = [3,3], target = 6', expected: '[0,1]', visible: false },
        ],
        starterCode: { python: 'def two_sum(nums, target):\n    pass', javascript: 'function twoSum(nums, target) {}' },
        allowedLanguages: ['python', 'javascript', 'java', 'cpp', 'go'],
        tags: ['arrays', 'hash-table'],
        source: 'llm',
        llmModel: 'gpt-4o',
        usageCount: 0,
      },
      {
        type: QuestionType.CODE,
        difficulty: Difficulty.MEDIUM,
        title: 'LRU Cache',
        content: 'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.',
        constraints: ['1 <= capacity <= 3000'],
        examples: [
          { input: '["LRUCache","put","put","get","put","get","put","get","get","get"]\n[[2],[1,1],[2,2],[1],[3,3],[2],[4,4],[1],[3],[4]]', output: '[null,null,null,1,null,-1,null,-1,3,4]' },
        ],
        testCases: [],
        starterCode: { python: 'class LRUCache:\n    def __init__(self, capacity: int):\n        pass\n    def get(self, key: int) -> int:\n        pass\n    def put(self, key: int, value: int) -> None:\n        pass', javascript: 'class LRUCache {\n  constructor(capacity) {}\n  get(key) {}\n  put(key, value) {}\n}' },
        allowedLanguages: ['python', 'javascript', 'java'],
        tags: ['hash-table', 'linked-list', 'design'],
        source: 'llm',
        llmModel: 'gpt-4o',
        usageCount: 0,
      },
      {
        type: QuestionType.ESSAY,
        difficulty: Difficulty.MEDIUM,
        title: 'CI/CD Pipeline Design',
        content: 'Design a CI/CD pipeline for a microservices application. Explain the stages, tools used, and how you would handle rollbacks.',
        constraints: [],
        examples: [],
        minWords: 150,
        maxWords: 500,
        rubric: { clarity: 20, completeness: 30, technical_accuracy: 30, best_practices: 20 },
        tags: ['devops', 'CI/CD', 'microservices'],
        source: 'llm',
        llmModel: 'gpt-4o',
        usageCount: 0,
      },
      {
        type: QuestionType.ESSAY,
        difficulty: Difficulty.EASY,
        title: 'Project Experience',
        content: 'Describe a project you are most proud of. What challenges did you face and how did you overcome them?',
        constraints: [],
        examples: [],
        minWords: 100,
        maxWords: 300,
        rubric: { clarity: 25, completeness: 25, problem_solving: 25, impact: 25 },
        tags: ['soft-skill', 'project'],
        source: 'llm',
        llmModel: 'gpt-4o',
        usageCount: 0,
      },
      {
        type: QuestionType.MCQ,
        difficulty: Difficulty.EASY,
        title: 'JavaScript Fundamentals',
        content: 'What is the output of: console.log(typeof null)?',
        options: [
          { id: 'a', text: '"null"' },
          { id: 'b', text: '"undefined"' },
          { id: 'c', text: '"object"' },
          { id: 'd', text: '"boolean"' },
        ],
        correctAnswer: 'c',
        tags: ['javascript', 'fundamentals'],
        source: 'llm',
        llmModel: 'gpt-4o',
        usageCount: 0,
      },
      {
        type: QuestionType.MCQ,
        difficulty: Difficulty.MEDIUM,
        title: 'React Hooks',
        content: 'Which hook would you use to persist state across re-renders without causing re-renders of child components?',
        options: [
          { id: 'a', text: 'useState' },
          { id: 'b', text: 'useContext + useReducer' },
          { id: 'c', text: 'useRef' },
          { id: 'd', text: 'useMemo' },
        ],
        correctAnswer: 'c',
        tags: ['react', 'hooks', 'performance'],
        source: 'llm',
        llmModel: 'gpt-4o',
        usageCount: 0,
      },
    ]);
    console.log(`Created ${questions.length} questions`);

    // --- Tests ---
    const tests = await Test.insertMany([
      {
        testId: 'TEST-ABC12345',
        applicationId: applications[1]._id,
        candidateId: candidates[1].user._id,
        jobId: jobs[0]._id,
        questionIds: [questions[0]._id, questions[1]._id, questions[2]._id, questions[3]._id, questions[4]._id],
        totalTime: 90,
        status: TestStatus.SUBMITTED,
        scheduledAt: new Date(Date.now() + 86400000),
        startedAt: new Date(Date.now() + 86400000),
        submittedAt: new Date(Date.now() + 86400000 + 5400000),
        language: 'python',
        focusLossCount: 2,
        answers: [
          { questionId: questions[0]._id.toString(), answer: 'def two_sum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        complement = target - num\n        if complement in seen:\n            return [seen[complement], i]\n        seen[num] = i\n    return []', language: 'python', flagged: false, timeSpent: 600 },
          { questionId: questions[1]._id.toString(), answer: '# LRU Cache implementation...', language: 'python', flagged: false, timeSpent: 1200 },
          { questionId: questions[2]._id.toString(), answer: 'A typical CI/CD pipeline for microservices includes: ...', flagged: false, timeSpent: 1800 },
          { questionId: questions[3]._id.toString(), answer: 'The project I am most proud of is...', flagged: false, timeSpent: 900 },
          { questionId: questions[4]._id.toString(), answer: 'c', flagged: false, timeSpent: 30 },
        ],
        proctoringLogs: [
          { timestamp: new Date(), type: 'info', event: 'test_started' },
          { timestamp: new Date(), type: 'warning', event: 'focus_loss', details: 'Window lost focus for 3 seconds' },
          { timestamp: new Date(), type: 'warning', event: 'focus_loss', details: 'Window lost focus for 5 seconds' },
          { timestamp: new Date(), type: 'info', event: 'test_submitted' },
        ],
      },
      {
        testId: 'TEST-DEF67890',
        applicationId: applications[2]._id,
        candidateId: candidates[2].user._id,
        jobId: jobs[1]._id,
        questionIds: [questions[0]._id, questions[2]._id, questions[3]._id, questions[4]._id, questions[5]._id],
        totalTime: 60,
        status: TestStatus.READY,
        scheduledAt: new Date(Date.now() + 172800000),
        language: 'python',
        focusLossCount: 0,
      },
    ]);
    console.log(`Created ${tests.length} tests`);

    console.log('\n--- Test Credentials ---');
    console.log('Admin:   admin@lotushack.com / Admin123!');
    console.log('HR:      hr@lotushack.com / Hr123456!');
    console.log('HR2:     hr2@dataflow.ai / Hr123456!');
    console.log('Cands:   candidate1@test.com - candidate5@test.com / Candidate123!');
    console.log('\n--- Test IDs ---');
    console.log(`TEST-ABC12345 (submitted by ${candidates[1].user.email})`);
    console.log(`TEST-DEF67890 (ready for ${candidates[2].user.email})`);

    console.log('\nSeed completed successfully!');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

seed();
