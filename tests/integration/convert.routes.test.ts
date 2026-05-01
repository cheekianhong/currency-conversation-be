// tests/integration/convert.routes.test.ts
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
    OPENEXCHANGERATES_APP_ID: 'test-app-id',
  },
}));

import { redis } from '../../src/config/redis';

const mockRedis = redis as jest.Mocked<typeof redis>;

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Convert Routes Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/convert', () => {
    it('should successfully convert currency when rates are fetched from API', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');

      const mockApiResponse = {
        base: 'USD',
        timestamp: 1696982400,
        rates: {
          USD: 1,
          EUR: 0.85,
          GBP: 0.75,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockApiResponse),
      });

      const res = await request(app).get('/api/convert?from=USD&to=EUR&amount=100');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.from).toBe('USD');
      expect(res.body.data.to).toBe('EUR');
      expect(res.body.data.rate).toBe(0.85);
      expect(res.body.data.converted).toBe(85);
      expect(res.body.data.amount).toBe(100);
      expect(mockFetch).toHaveBeenCalled();
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should successfully convert currency when rates are from Redis cache', async () => {
      const mockCachedResponse = {
        base: 'USD',
        timestamp: 1696982400,
        rates: {
          USD: 1,
          EUR: 0.85,
          GBP: 0.75,
        },
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockCachedResponse));

      const res = await request(app).get('/api/convert?from=USD&to=EUR&amount=100');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.from).toBe('USD');
      expect(res.body.data.to).toBe('EUR');
      expect(res.body.data.rate).toBe(0.85);
      expect(res.body.data.converted).toBe(85);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle validation error for missing query params', async () => {
      const res = await request(app).get('/api/convert');
      expect(res.status).toBe(422);
    });

    it('should return 502 when upstream API fails', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockFetch.mockRejectedValue(new Error('Network error'));

      const res = await request(app).get('/api/convert?from=USD&to=EUR&amount=100');

      expect(res.status).toBe(502);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Failed to reach exchange rates provider');
    });
  });

  describe('GET /api/rates', () => {
    it('should successfully return rates', async () => {
      const mockCachedResponse = {
        base: 'USD',
        timestamp: 1696982400,
        rates: {
          USD: 1,
          EUR: 0.85,
          GBP: 0.75,
        },
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockCachedResponse));

      const res = await request(app).get('/api/rates');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toEqual({
        USD: 1,
        EUR: 0.85,
        GBP: 0.75,
      });
    });

    it('should return 502 when upstream API fails', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockFetch.mockRejectedValue(new Error('Network error'));

      const res = await request(app).get('/api/rates');

      expect(res.status).toBe(502);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Failed to reach exchange rates provider');
    });
  });

  describe('GET /api/convert/countries', () => {
    it('should successfully list countries', async () => {
      const mockCachedResponse = {
        base: 'USD',
        timestamp: 1696982400,
        rates: {
          USD: 1,
          EUR: 0.85,
          GBP: 0.75,
        },
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockCachedResponse));

      const res = await request(app).get('/api/convert/countries');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.counties).toEqual(['EUR', 'GBP', 'USD']);
    });
  });
});
