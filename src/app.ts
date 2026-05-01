// src/app.ts
import express, { Application } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import helmet from 'helmet';
import { swaggerSpec } from './swagger';
import { morganStream } from './utils/logger';
import { globalRateLimit } from './middlewares/rateLimit.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import apiRoutes from './routes/index';
import { env } from './config/env';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(
    cors({
      origin: '*',
    }),
  );

  app.use(
    morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined', { stream: morganStream }),
  );

  app.use(globalRateLimit);

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use('/api', apiRoutes);

  app.use(errorMiddleware);

  return app;
}
