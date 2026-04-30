// tests/integration/auth.routes.test.ts
import request from 'supertest';
import { createApp } from '../../src/app';
import { Application } from 'express';

jest.mock('../../src/config/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
}));

jest.mock('../../src/config/redis', () => ({
  redis: {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  },
  connectRedis: jest.fn(),
  disconnectRedis: jest.fn(),
}));

jest.mock('../../src/config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3000,
    JWT_ACCESS_SECRET: 'test-access-secret-min-32-chars-long-here',
    JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-chars-long-here',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    RATE_LIMIT_WINDOW_MS: 900000,
    RATE_LIMIT_MAX: 100,
    AUTH_RATE_LIMIT_MAX: 10,
  },
}));

import { prisma } from '../../src/config/db';
import { redis } from '../../src/config/redis';

const mockPrismaUser = prisma.user as jest.Mocked<typeof prisma.user>;
const mockRedis = redis as jest.Mocked<typeof redis>;

describe('Auth Routes Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
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

      const res = await request(app).post('/api/auth/register').send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.tokens.accessToken).toBeDefined();
    });

    it('should return 422 for invalid request body', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'not-an-email',
        password: '123',
      });

      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 401 for invalid credentials', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      const res = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/health', () => {
    it('should return 200 health check', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
