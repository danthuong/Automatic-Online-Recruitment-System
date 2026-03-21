import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, Candidate } from '../models';
import { UserRole, JWTPayload, AuthTokens, UserResponse, CandidateStatus } from '../types';
import { UnauthorizedError, ConflictError, NotFoundError } from '../utils/errors';

const ACCESS_TOKEN_EXPIRY = 900;
const REFRESH_TOKEN_EXPIRY = 604800;

export class AuthService {
  private static generateTokens(payload: JWTPayload): AuthTokens {
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
    const refreshToken = jwt.sign({ userId: payload.userId }, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });
    return { accessToken, refreshToken };
  }

  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static toUserResponse(user: {
    _id: { toString: () => string };
    email: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    isActive: boolean;
    createdAt: Date;
  }): UserResponse {
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

  static async register(params: {
    email: string;
    password: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    githubUrl?: string;
    cvFileId?: string;
    faceImageFileId?: string;
  }): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    const existingUser = await User.findOne({ email: params.email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
    const hashedPassword = await bcrypt.hash(params.password, saltRounds);

    const user = await User.create({
      email: params.email.toLowerCase(),
      password: hashedPassword,
      role: params.role,
      firstName: params.firstName,
      lastName: params.lastName,
    });

    if (params.role === UserRole.CANDIDATE) {
      await Candidate.create({
        userId: user._id,
        skills: [],
        experience: 0,
        applicationStatus: CandidateStatus.PENDING,
        githubUrl: params.githubUrl ? `https://github.com/${params.githubUrl}` : undefined,
        cvUrl: params.cvFileId ? `/files/${params.cvFileId}` : undefined,
        faceImageUrl: params.faceImageFileId ? `/files/${params.faceImageFileId}` : undefined,
      });
    }

    const payload: JWTPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const tokens = this.generateTokens(payload);

    user.refreshTokenHash = this.hashToken(tokens.refreshToken);
    await user.save();

    return {
      user: this.toUserResponse(user),
      tokens,
    };
  }

  static async login(
    email: string,
    password: string
  ): Promise<{ user: UserResponse; tokens: AuthTokens }> {
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+refreshTokenHash +password'
    );

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account has been deactivated');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const payload: JWTPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const tokens = this.generateTokens(payload);

    user.refreshTokenHash = this.hashToken(tokens.refreshToken);
    await user.save();

    return {
      user: this.toUserResponse(user),
      tokens,
    };
  }

  static async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET!
      ) as { userId: string };

      const user = await User.findById(payload.userId).select('+refreshTokenHash');

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      if (!user.isActive) {
        throw new UnauthorizedError('Account has been deactivated');
      }

      const tokenHash = this.hashToken(refreshToken);
      if (user.refreshTokenHash !== tokenHash) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      const newPayload: JWTPayload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      };

      const accessToken = jwt.sign(newPayload, process.env.JWT_SECRET!, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
      });

      return { accessToken };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Invalid or expired refresh token');
      }
      throw error;
    }
  }

  static async logout(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { refreshTokenHash: undefined });
  }

  static async getMe(userId: string): Promise<UserResponse> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return this.toUserResponse(user);
  }
}
