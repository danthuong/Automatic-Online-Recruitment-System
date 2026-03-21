import { Request, Response } from 'express';
import { z } from 'zod';
import { CompanyService } from '../services/companyService';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const createCompanySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Company name is required').max(200),
    description: z.string().optional(),
    website: z.string().url().optional().or(z.literal('')),
    logoUrl: z.string().url().optional().or(z.literal('')),
    industry: z.string().optional(),
    size: z.string().optional(),
    location: z.string().optional(),
    foundedYear: z.number().int().min(1800).max(2100).optional(),
  }),
});

export const updateCompanySchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    website: z.string().url().optional().or(z.literal('')),
    logoUrl: z.string().url().optional().or(z.literal('')),
    industry: z.string().optional(),
    size: z.string().optional(),
    location: z.string().optional(),
    foundedYear: z.number().int().min(1800).max(2100).optional(),
  }),
});

export const getAllSchema = z.object({
  query: z.object({
    page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
    limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 20)),
    industry: z.string().optional(),
    location: z.string().optional(),
    isVerified: z.string().optional().transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
    search: z.string().optional(),
  }),
});

export const verifySchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const create = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const company = await CompanyService.create({ ...req.body, createdBy: userId });
    ApiResponse.created(res, company, 'Company created successfully');
  }
);

export const getAll = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { page, limit, industry, location, isVerified, search } = req.query as {
      page?: number;
      limit?: number;
      industry?: string;
      location?: string;
      isVerified?: boolean;
      search?: string;
    };

    const result = await CompanyService.getAll({ page, limit, industry, location, isVerified, search });
    ApiResponse.paginated(res, result.companies, page || 1, limit || 20, result.total);
  }
);

export const getById = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const company = await CompanyService.getById(req.params.id);
    ApiResponse.success(res, company);
  }
);

export const update = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const company = await CompanyService.update(
      req.params.id,
      req.user!.userId,
      req.user!.role,
      req.body
    );
    ApiResponse.success(res, company, 'Company updated successfully');
  }
);

export const verify = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const company = await CompanyService.verify(req.params.id, req.user!.role);
    ApiResponse.success(res, company, 'Company verified successfully');
  }
);
