// tests/unit/auth.service.test.ts
import { AuthService } from '../../src/services/auth.service';
import { AppError } from '../../src/utils/AppError';

jest.mock('../../src/config/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('../../src/config/redis', () => ({
  redis: {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock('../../src/config/env', () => ({
  env: {
    NODE_ENV: 'test',
    JWT_ACCESS_SECRET: 'test-access-secret-min-32-chars-long-here',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-chars-long-here',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
  },
}));

import { prisma } from '../../src/config/db';
import { redis } from '../../src/config/redis';

const mockPrismaUser = prisma.user as jest.Mocked<typeof prisma.user>;
const mockRedis = redis as jest.Mocked<typeof redis>;

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);
      mockPrismaUser.create.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRedis.set.mockResolvedValue('OK');

      const result = await authService.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should throw conflict error if email already exists', async () => {
      mockPrismaUser.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com',
        name: 'Existing User',
        role: 'USER',
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      const crypto = await import('crypto');
      const passwordHash = crypto.createHash('sha256').update('password123').digest('hex');

      mockPrismaUser.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockRedis.set.mockResolvedValue('OK');

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens.accessToken).toBeDefined();
    });

    it('should throw unauthorized error with wrong credentials', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('logout', () => {
    it('should delete refresh token from redis', async () => {
      mockRedis.del.mockResolvedValue(1);

      await authService.logout('some-refresh-token');

      expect(mockRedis.del).toHaveBeenCalledWith('refresh:some-refresh-token');
    });
  });
});
