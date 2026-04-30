// src/services/auth.service.ts
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS } from '../utils/httpStatus';
import { JwtPayload, TokenPair } from '../types/jwt.types';

interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface UserPublic {
  id: string;
  email: string;
  name: string;
  role: string;
}

const REFRESH_TOKEN_PREFIX = 'refresh:';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export class AuthService {
  private generateTokens(user: UserPublic): TokenPair {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    } as jwt.SignOptions);

    return { accessToken, refreshToken };
  }

  async register(input: RegisterInput): Promise<{ user: UserPublic; tokens: TokenPair }> {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new AppError('Email already registered', HTTP_STATUS.CONFLICT);
    }

    const passwordHash = hashPassword(input.password);
    const user = await prisma.user.create({
      data: { email: input.email, passwordHash, name: input.name },
      select: { id: true, email: true, name: true, role: true },
    });

    const userPublic: UserPublic = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const tokens = this.generateTokens(userPublic);
    const refreshPayload = jwt.decode(tokens.refreshToken) as JwtPayload;
    const ttl = (refreshPayload.exp ?? 0) - Math.floor(Date.now() / 1000);
    await redis.set(`${REFRESH_TOKEN_PREFIX}${tokens.refreshToken}`, user.id, 'EX', ttl);

    return { user: userPublic, tokens };
  }

  async login(input: LoginInput): Promise<{ user: UserPublic; tokens: TokenPair }> {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      throw new AppError('Invalid credentials', HTTP_STATUS.UNAUTHORIZED);
    }

    const userPublic: UserPublic = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const tokens = this.generateTokens(userPublic);
    const refreshPayload = jwt.decode(tokens.refreshToken) as JwtPayload;
    const ttl = (refreshPayload.exp ?? 0) - Math.floor(Date.now() / 1000);
    await redis.set(`${REFRESH_TOKEN_PREFIX}${tokens.refreshToken}`, user.id, 'EX', ttl);

    return { user: userPublic, tokens };
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    let payload: JwtPayload;
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtPayload;
    } catch {
      throw new AppError('Invalid refresh token', HTTP_STATUS.UNAUTHORIZED);
    }

    const stored = await redis.get(`${REFRESH_TOKEN_PREFIX}${refreshToken}`);
    if (!stored) {
      throw new AppError('Refresh token revoked', HTTP_STATUS.UNAUTHORIZED);
    }

    await redis.del(`${REFRESH_TOKEN_PREFIX}${refreshToken}`);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }

    const userPublic: UserPublic = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const tokens = this.generateTokens(userPublic);
    const newRefreshPayload = jwt.decode(tokens.refreshToken) as JwtPayload;
    const ttl = (newRefreshPayload.exp ?? 0) - Math.floor(Date.now() / 1000);
    await redis.set(`${REFRESH_TOKEN_PREFIX}${tokens.refreshToken}`, user.id, 'EX', ttl);

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    await redis.del(`${REFRESH_TOKEN_PREFIX}${refreshToken}`);
  }

  async getMe(userId: string): Promise<UserPublic> {
    const cacheKey = `user:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as UserPublic;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    }

    const userPublic: UserPublic = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    await redis.set(cacheKey, JSON.stringify(userPublic), 'EX', 300);
    return userPublic;
  }
}
