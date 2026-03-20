export enum UserRole {
  ADMIN = 'admin',
  HR = 'hr',
  CANDIDATE = 'candidate',
}

export interface IUser {
  _id: string;
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  isActive: boolean;
  refreshTokenHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICandidate {
  _id: string;
  userId: string;
  phone?: string;
  resumeUrl?: string;
  skills: string[];
  experience: number;
  education?: string;
  linkedInUrl?: string;
  portfolioUrl?: string;
  wowScore?: number;
  applicationStatus?: CandidateStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum CandidateStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  INVITED = 'invited',
  TESTING = 'testing',
  PASSED = 'passed',
  FAILED = 'failed',
  SUSPENDED = 'suspended',
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserResponse {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: Date;
}

export interface CandidateResponse {
  id: string;
  userId: string;
  user?: UserResponse;
  phone?: string;
  resumeUrl?: string;
  skills: string[];
  experience: number;
  education?: string;
  linkedInUrl?: string;
  portfolioUrl?: string;
  wowScore?: number;
  applicationStatus?: CandidateStatus;
  createdAt: Date;
}
