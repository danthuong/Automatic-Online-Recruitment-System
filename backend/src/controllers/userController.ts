import { Request, Response } from 'express';
import { z } from 'zod';
import { UserService } from '../services/userService';
import { UserRole } from '../types';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const getAllSchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20)),
    role: z.enum(['admin', 'hr', 'candidate']).optional(),
    search: z.string().optional(),
  }),
});

export const updateSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    phone: z.string().optional(),
    education: z.string().optional(),
    linkedInUrl: z.string().url().optional().or(z.literal('')),
    portfolioUrl: z.string().url().optional().or(z.literal('')),
    skills: z.array(z.string()).optional(),
    experience: z.number().min(0).optional(),
  }),
});

export const deleteSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const getAll = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { page, limit, role, search } = req.query as {
      page?: number;
      limit?: number;
      role?: UserRole;
      search?: string;
    };

    const result = await UserService.getAll({ page, limit, role, search });
    ApiResponse.paginated(
      res,
      result.users,
      page || 1,
      limit || 20,
      result.total
    );
  }
);

export const getById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const user = await UserService.getById(id);
    ApiResponse.success(res, user);
  }
);

export const getMyCandidateProfile = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const candidate = await UserService.getCandidateByUserId(userId);
    if (!candidate) {
      ApiResponse.error(res, 'Candidate profile not found', 404);
      return;
    }
    ApiResponse.success(res, candidate);
  }
);

export const getCandidateProfile = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const candidate = await UserService.getCandidateByUserId(id);
    if (!candidate) {
      ApiResponse.error(res, 'Candidate profile not found', 404);
      return;
    }
    ApiResponse.success(res, candidate);
  }
);

export const update = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const requestingUserId = req.user!.userId;
    const requestingUserRole = req.user!.role;

    const user = await UserService.update(id, requestingUserId, requestingUserRole, req.body);
    ApiResponse.success(res, user, 'User updated successfully');
  }
);

export const remove = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const requestingUserRole = req.user!.role;
    await UserService.delete(id, requestingUserRole);
    ApiResponse.success(res, null, 'User deleted successfully');
  }
);
