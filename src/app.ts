// src/app.ts
import express, { Application } from 'express';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../swagger';
import { morganStream } from './utils/logger';
import { globalRateLimit } from './middlewares/rateLimit.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import apiRoutes from './routes/index';
import { env } from './config/env';

export function createApp(): Application {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  if (env.NODE_ENV !== 'test') {
    app.use(morgan('combined', { stream: morganStream }));
  }

  app.use(globalRateLimit);

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use('/api', apiRoutes);

  app.use(errorMiddleware);

  return app;
}
