// src/utils/logger.ts
import winston from 'winston';
import { env } from '../config/env';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const developmentFormat = combine(colorize(), timestamp(), errors({ stack: true }), simple());

const productionFormat = combine(timestamp(), errors({ stack: true }), json());

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  transports: [new winston.transports.Console()],
  exitOnError: false,
});

export const morganStream = {
  write: (message: string): void => {
    logger.info(message.trim());
  },
};
