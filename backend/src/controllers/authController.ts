import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/authService';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

const githubUsernameRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/

const baseFields = {
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum(['admin', 'hr', 'candidate']).optional().default('candidate'),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
}

const candidateFields = {
  githubUrl: z
    .string()
    .min(1, 'GitHub username is required')
    .max(39, 'GitHub username must be 39 characters or less')
    .regex(githubUsernameRegex, 'Invalid GitHub username format'),
  cvFileId: z.string().min(1, 'CV file is required'),
  faceImageFileId: z.string().min(1, 'Face image is required'),
}

const hrFields = {
  githubUrl: z.string().optional(),
  cvFileId: z.string().optional(),
  faceImageFileId: z.string().optional(),
}

export const registerSchema = z.object({
  body: z
    .object(baseFields)
    .merge(z.object(candidateFields))
    .merge(z.object(hrFields))
    .superRefine((data, ctx) => {
      if (data.role === 'candidate' || !data.role) {
        if (!data.githubUrl) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'GitHub username is required for candidates',
            path: ['githubUrl'],
          })
        }
        if (!data.cvFileId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'CV file is required for candidates',
            path: ['cvFileId'],
          })
        }
        if (!data.faceImageFileId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Face image is required for candidates',
            path: ['faceImageFileId'],
          })
        }
      }
    }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export const register = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, password, role, firstName, lastName, githubUrl, cvFileId, faceImageFileId } = req.body;
    const result = await AuthService.register({
      email,
      password,
      role,
      firstName,
      lastName,
      githubUrl,
      cvFileId,
      faceImageFileId,
    });
    ApiResponse.created(res, result, 'User registered successfully');
  }
);

export const login = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    ApiResponse.success(res, result, 'Login successful');
  }
);

export const refresh = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;
    const result = await AuthService.refresh(refreshToken);
    ApiResponse.success(res, result, 'Token refreshed');
  }
);

export const logout = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    await AuthService.logout(userId);
    ApiResponse.success(res, null, 'Logged out successfully');
  }
);

export const me = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const user = await AuthService.getMe(userId);
    ApiResponse.success(res, user);
  }
);
