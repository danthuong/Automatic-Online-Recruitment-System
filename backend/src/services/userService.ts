import { User, Candidate } from '../models';
import { UserRole, UserResponse, CandidateResponse } from '../types';
import { NotFoundError, ForbiddenError } from '../utils/errors';

export class UserService {
  static async getAll(params: {
    page?: number;
    limit?: number;
    role?: UserRole;
    search?: string;
  }): Promise<{ users: UserResponse[]; total: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { isActive: true };

    if (params.role) {
      filter.role = params.role;
    }

    if (params.search) {
      filter.$or = [
        { firstName: { $regex: params.search, $options: 'i' } },
        { lastName: { $regex: params.search, $options: 'i' } },
        { email: { $regex: params.search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);

    return {
      users: users.map((u) => ({
        id: u._id.toString(),
        email: u.email,
        role: u.role,
        firstName: u.firstName,
        lastName: u.lastName,
        isActive: u.isActive,
        createdAt: u.createdAt,
      })),
      total,
    };
  }

  static async getById(id: string): Promise<UserResponse> {
    const user = await User.findById(id);
    if (!user || !user.isActive) {
      throw new NotFoundError('User not found');
    }
    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  static async getCandidateByUserId(userId: string): Promise<CandidateResponse | null> {
    const candidate = await Candidate.findOne({ userId });
    if (!candidate) return null;

    const user = await User.findById(userId);
    return {
      id: candidate._id.toString(),
      userId: candidate.userId.toString(),
      user: user
        ? {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            isActive: user.isActive,
            createdAt: user.createdAt,
          }
        : undefined,
      phone: candidate.phone ?? undefined,
      resumeUrl: candidate.resumeUrl ?? undefined,
      skills: candidate.skills,
      experience: candidate.experience,
      education: candidate.education ?? undefined,
      linkedInUrl: candidate.linkedInUrl ?? undefined,
      portfolioUrl: candidate.portfolioUrl ?? undefined,
      wowScore: candidate.wowScore,
      createdAt: candidate.createdAt,
    };
  }

  static async update(
    id: string,
    requestingUserId: string,
    requestingUserRole: UserRole,
    updates: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      education?: string;
      linkedInUrl?: string;
      portfolioUrl?: string;
      skills?: string[];
      experience?: number;
    }
  ): Promise<UserResponse> {
    const isSelf = id === requestingUserId;
    const isAdmin = requestingUserRole === UserRole.ADMIN;

    if (!isSelf && !isAdmin) {
      throw new ForbiddenError('You can only update your own profile');
    }

    const user = await User.findByIdAndUpdate(
      id,
      {
        ...(updates.firstName && { firstName: updates.firstName }),
        ...(updates.lastName && { lastName: updates.lastName }),
      },
      { new: true }
    );

    if (!user || !user.isActive) {
      throw new NotFoundError('User not found');
    }

    const candidateUpdates: Record<string, unknown> = {};
    if (updates.phone !== undefined) candidateUpdates.phone = updates.phone;
    if (updates.education !== undefined) candidateUpdates.education = updates.education;
    if (updates.linkedInUrl !== undefined) candidateUpdates.linkedInUrl = updates.linkedInUrl;
    if (updates.portfolioUrl !== undefined) candidateUpdates.portfolioUrl = updates.portfolioUrl;
    if (updates.skills !== undefined) candidateUpdates.skills = updates.skills;
    if (updates.experience !== undefined) candidateUpdates.experience = updates.experience;

    if (Object.keys(candidateUpdates).length > 0) {
      await Candidate.findOneAndUpdate({ userId: id }, candidateUpdates, { new: true });
    }

    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  static async delete(
    id: string,
    requestingUserRole: UserRole
  ): Promise<void> {
    if (requestingUserRole !== UserRole.ADMIN) {
      throw new ForbiddenError('Only admins can delete users');
    }

    const user = await User.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      throw new NotFoundError('User not found');
    }
  }
}
