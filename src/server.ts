// src/server.ts
import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/db';
import { connectRedis, disconnectRedis } from './config/redis';
import { logger } from './utils/logger';
import http from 'http';

let server: http.Server;

async function start(): Promise<void> {
  // await connectDatabase();
  // logger.info('Database connected');

  await connectRedis();
  logger.info('Redis connected');

  const app = createApp();
  server = http.createServer(app);

  server.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
}

async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  if (server) {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }

  await disconnectDatabase();
  await disconnectRedis();

  logger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

start().catch((err: Error) => {
  logger.error('Failed to start server', { error: err.message });
  process.exit(1);
});
