import { Company } from '../models';
import { CompanyResponse, UserRole } from '../types';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';

export class CompanyService {
  static toResponse(company: InstanceType<typeof Company>): CompanyResponse {
    const doc = company as unknown as Record<string, unknown>;
    return {
      id: (doc._id as string),
      name: doc.name as string,
      description: doc.description as string | undefined,
      website: doc.website as string | undefined,
      logoUrl: doc.logoUrl as string | undefined,
      industry: doc.industry as string | undefined,
      size: doc.size as string | undefined,
      location: doc.location as string | undefined,
      foundedYear: doc.foundedYear as number | undefined,
      createdBy: (doc.createdBy as string),
      isVerified: doc.isVerified as boolean,
      createdAt: doc.createdAt as Date,
    };
  }

  static async create(data: {
    name: string;
    description?: string;
    website?: string;
    logoUrl?: string;
    industry?: string;
    size?: string;
    location?: string;
    foundedYear?: number;
    createdBy: string;
  }): Promise<CompanyResponse> {
    const existing = await Company.findOne({ name: data.name });
    if (existing) {
      throw new ConflictError('Company name already exists');
    }

    const company = await Company.create(data);
    return this.toResponse(company);
  }

  static async getAll(params: {
    page?: number;
    limit?: number;
    industry?: string;
    location?: string;
    isVerified?: boolean;
    search?: string;
  }): Promise<{ companies: CompanyResponse[]; total: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (params.industry) filter.industry = params.industry;
    if (params.location) filter.location = params.location;
    if (params.isVerified !== undefined) filter.isVerified = params.isVerified;
    if (params.search) {
      filter.$or = [
        { name: { $regex: params.search, $options: 'i' } },
        { description: { $regex: params.search, $options: 'i' } },
      ];
    }

    const [companies, total] = await Promise.all([
      Company.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Company.countDocuments(filter),
    ]);

    return {
      companies: companies.map((c) => this.toResponse(c)),
      total,
    };
  }

  static async getById(id: string): Promise<CompanyResponse> {
    const company = await Company.findById(id);
    if (!company) {
      throw new NotFoundError('Company not found');
    }
    return this.toResponse(company);
  }

  static async update(
    id: string,
    requestingUserId: string,
    requestingUserRole: UserRole,
    updates: Partial<{
      name: string;
      description: string;
      website: string;
      logoUrl: string;
      industry: string;
      size: string;
      location: string;
      foundedYear: number;
    }>
  ): Promise<CompanyResponse> {
    if (requestingUserRole !== UserRole.ADMIN && requestingUserRole !== UserRole.HR) {
      throw new ForbiddenError('Only admin or HR can update company');
    }

    if (updates.name) {
      const existing = await Company.findOne({ name: updates.name, _id: { $ne: id } });
      if (existing) {
        throw new ConflictError('Company name already exists');
      }
    }

    const company = await Company.findByIdAndUpdate(id, updates, { new: true });
    if (!company) {
      throw new NotFoundError('Company not found');
    }
    return this.toResponse(company);
  }

  static async verify(id: string, requestingUserRole: UserRole): Promise<CompanyResponse> {
    if (requestingUserRole !== UserRole.ADMIN) {
      throw new ForbiddenError('Only admin can verify companies');
    }

    const company = await Company.findByIdAndUpdate(id, { isVerified: true }, { new: true });
    if (!company) {
      throw new NotFoundError('Company not found');
    }
    return this.toResponse(company);
  }
}
