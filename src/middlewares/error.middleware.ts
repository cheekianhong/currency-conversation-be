// src/middlewares/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS, HttpStatus } from '../utils/httpStatus';
import { logger } from '../utils/logger';
import { env } from '../config/env';

interface ErrorResponse {
  status: string;
  message: string;
  errors?: unknown;
  stack?: string;
}

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  let statusCode: HttpStatus = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const response: ErrorResponse = {
    status: 'error',
    message: 'Internal server error',
  };

  if (err instanceof AppError) {
    statusCode = err.statusCode as HttpStatus;
    response.status = err.isOperational ? 'fail' : 'error';
    response.message = err.message;
  } else if (err instanceof ZodError) {
    statusCode = HTTP_STATUS.UNPROCESSABLE_ENTITY;
    response.status = 'fail';
    response.message = 'Validation error';
    response.errors = err.flatten().fieldErrors;
  } else {
    logger.error('Unhandled error', { error: err.message, stack: err.stack });
  }

  if (env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
