---
name: nodejs-express-ts-api
description: >
  Scaffold and generate a complete, production-ready Node.js 22 + TypeScript 5
  REST API using Express.js. Use this skill whenever the user asks to build,
  generate, scaffold, or create a Node.js API, Express server, REST backend,
  TypeScript server, or any backend service with Express. Also trigger when the
  user mentions setting up authentication, CRUD endpoints, middleware, Docker
  for Node.js, or GitHub Actions CI for an Express project. This skill enforces
  12 best practices, uses MVC architecture, Prisma (MySQL), ioredis (Redis),
  JWT auth, Zod validation, Winston logging, Swagger docs, rate limiting,
  Jest + Supertest tests, ESLint + Prettier, Docker, and GitHub Actions.
  Always use this skill for any Node.js/Express/TypeScript backend request,
  even if the user only mentions one part of the stack (e.g. "set up JWT auth
  in Express" or "add Swagger to my Node app").
---

# Node.js 22 + TypeScript REST API Skill

## Purpose
Generate a complete, deterministic, production-grade Express.js REST API.
Every output follows the same structure, conventions, and file order — so any
AI produces the same code every single run.

---

## Hard Constraints (never deviate)

| Constraint | Value |
|---|---|
| Runtime | Node.js 22, ES2022 target |
| Language | TypeScript 5.x — `strict: true`, no `any`, no implicit types |
| Architecture | MVC: Model → Controller → Service |
| Package manager | npm |
| Async style | async/await only (no callbacks, no raw .then chains) |
| Env validation | All `process.env` access validated at startup via Zod |
| Error handling | All async handlers wrapped with `asyncHandler()`; global error middleware |
| HTTP codes | Named constants only (`HTTP_STATUS.OK`) — no raw numbers |

---

## Exact Tech Stack

```
express                 ^4.19
typescript              ^5.4
prisma + @prisma/client ^5.x   ← MySQL adapter
ioredis                 ^5.x
jsonwebtoken            ^9.x
zod                     ^3.x
winston                 ^3.x
morgan                  ^1.x
swagger-ui-express      latest
swagger-jsdoc           latest
express-rate-limit      ^7.x
jest                    ^29.x
supertest               ^7.x
ts-jest                 latest
eslint                  ^9.x
prettier                ^3.x
dotenv                  ^16.x
```

---

## Canonical Folder Structure

Output this structure exactly — no additions, no renames:

```
project-root/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── config/
│   │   ├── env.ts          ← Zod-validated env schema
│   │   ├── db.ts           ← Prisma client singleton
│   │   └── redis.ts        ← ioredis client singleton
│   ├── controllers/
│   │   └── auth.controller.ts
│   ├── services/
│   │   └── auth.service.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── validate.middleware.ts
│   │   └── rateLimit.middleware.ts
│   ├── routes/
│   │   ├── index.ts        ← aggregates all routers
│   │   └── auth.routes.ts
│   ├── utils/
│   │   ├── AppError.ts
│   │   ├── asyncHandler.ts
│   │   ├── httpStatus.ts
│   │   └── logger.ts
│   ├── types/
│   │   ├── express.d.ts    ← augmented Request (adds req.user)
│   │   └── jwt.types.ts
│   ├── app.ts              ← Express factory (no listen)
│   └── server.ts           ← listen() + graceful shutdown
├── tests/
│   ├── unit/
│   │   └── auth.service.test.ts
│   └── integration/
│       └── auth.routes.test.ts
├── .github/
│   └── workflows/
│       └── ci.yml
├── swagger.ts
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── jest.config.ts
├── tsconfig.json
└── package.json
```

---

## 12 Best Practices — Implementation Rules

### 1. Strict TypeScript
`tsconfig.json` must include:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "dist",
    "rootDir": "src",
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### 2. MVC Separation
- Controllers: receive `req`/`res`, call service, return response. Zero business logic.
- Services: all business logic, DB access via Prisma, cache via Redis. Zero Express types.
- Models: defined only in `prisma/schema.prisma`. No Mongoose, no raw SQL models.

### 3. Centralized Error Handling
```typescript
// src/utils/AppError.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}

// src/middlewares/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ status: 'error', message: err.message });
    return;
  }
  logger.error(err);
  res.status(500).json({ status: 'error', message: 'Internal server error' });
};
```

### 4. Env Validation at Startup
```typescript
// src/config/env.ts
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
});

export const env = envSchema.parse(process.env);
// process crashes here if any variable is missing or wrong type
```

### 5. Request Validation Middleware
```typescript
// src/middlewares/validate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { HTTP_STATUS } from '../utils/httpStatus';

export const validate =
  (schema: AnyZodObject) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new AppError(err.errors[0].message, HTTP_STATUS.UNPROCESSABLE_ENTITY));
      } else {
        next(err);
      }
    }
  };
```

### 6. asyncHandler Utility
```typescript
// src/utils/asyncHandler.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export const asyncHandler =
  (fn: AsyncFn): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
```
All route handlers: `router.post('/login', asyncHandler(authController.login))`

### 7. HTTP Status Constants
```typescript
// src/utils/httpStatus.ts
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;
```

### 8. JWT Access + Refresh Token Strategy
- Access token: 15 min expiry, signed with `JWT_ACCESS_SECRET`
- Refresh token: 7 day expiry, signed with `JWT_REFRESH_SECRET`
- Refresh token stored in Redis with key `refresh:<userId>` and TTL 7d
- On refresh: verify token, check Redis, issue new pair, rotate refresh token
- On logout: delete Redis key

```typescript
// src/config/redis.ts
import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL);
redis.on('error', (err) => logger.error('Redis error', err));
```

### 9. Redis Caching Layer
- Cache pattern: `cache:<route>:<param>` with TTL in seconds
- Service layer checks Redis before querying Prisma:
```typescript
const cached = await redis.get(`user:${id}`);
if (cached) return JSON.parse(cached);
const user = await prisma.user.findUniqueOrThrow({ where: { id } });
await redis.setex(`user:${id}`, 300, JSON.stringify(user));
return user;
```
- Invalidate on mutations: `await redis.del(`user:${id}`)`

### 10. Structured Logging
```typescript
// src/utils/logger.ts
import winston from 'winston';
import { env } from '../config/env';

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: env.NODE_ENV === 'production'
    ? winston.format.json()
    : winston.format.combine(winston.format.colorize(), winston.format.simple()),
  transports: [new winston.transports.Console()],
});

// Morgan uses Winston stream:
export const morganStream = {
  write: (message: string) => logger.http(message.trim()),
};
```
In `app.ts`: `app.use(morgan('combined', { stream: morganStream }))`

### 11. Rate Limiting
```typescript
// src/middlewares/rateLimit.middleware.ts
import rateLimit from 'express-rate-limit';

export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many requests, please try again later.' },
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: 'Too many auth attempts, please try again later.' },
});
```
Apply `globalRateLimit` on all routes, `authRateLimit` on `/auth/*`.

### 12. Graceful Shutdown
```typescript
// src/server.ts
import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/db';
import { redis } from './config/redis';
import { logger } from './utils/logger';

const server = app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

const shutdown = async (signal: string) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    await prisma.$disconnect();
    redis.disconnect();
    logger.info('Graceful shutdown complete');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', reason);
  process.exit(1);
});
```

---

## File Output Order

When generating the project, always output files in this exact sequence:

```
 1. package.json
 2. tsconfig.json
 3. jest.config.ts
 4. .env.example
 5. .eslintrc.json
 6. .prettierrc
 7. prisma/schema.prisma
 8. src/config/env.ts
 9. src/config/db.ts
10. src/config/redis.ts
11. src/utils/AppError.ts
12. src/utils/httpStatus.ts
13. src/utils/logger.ts
14. src/utils/asyncHandler.ts
15. src/middlewares/error.middleware.ts
16. src/middlewares/validate.middleware.ts
17. src/middlewares/auth.middleware.ts
18. src/middlewares/rateLimit.middleware.ts
19. src/types/express.d.ts
20. src/types/jwt.types.ts
21. src/services/auth.service.ts
22. src/controllers/auth.controller.ts
23. src/routes/auth.routes.ts
24. src/routes/index.ts
25. src/app.ts
26. src/server.ts
27. swagger.ts
28. Dockerfile
29. docker-compose.yml
30. .github/workflows/ci.yml
31. tests/unit/auth.service.test.ts
32. tests/integration/auth.routes.test.ts
```

Print filename as a comment on line 1 of every file.
Do not truncate any file. Do not add prose between files.
Output all 32 files completely before stopping.

---

## Key File Templates

### app.ts
```typescript
// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../swagger';
import { router } from './routes';
import { errorMiddleware } from './middlewares/error.middleware';
import { globalRateLimit } from './middlewares/rateLimit.middleware';
import { morganStream } from './utils/logger';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: morganStream }));
app.use(globalRateLimit);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/v1', router);

app.use(errorMiddleware);
```

### Dockerfile
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### docker-compose.yml
```yaml
version: '3.9'
services:
  app:
    build: .
    ports: ["3000:3000"]
    env_file: .env
    depends_on: [mysql, redis]
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: appdb
    ports: ["3306:3306"]
    volumes: [mysql_data:/var/lib/mysql]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
volumes:
  mysql_data:
```

### GitHub Actions CI
```yaml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: testdb
        ports: ["3306:3306"]
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npx prisma generate
      - run: npm run lint
      - run: npm run type-check
      - run: npm test -- --coverage
    env:
      NODE_ENV: test
      DATABASE_URL: mysql://root:root@localhost:3306/testdb
      REDIS_URL: redis://localhost:6379
      JWT_ACCESS_SECRET: test-access-secret-minimum-32-chars
      JWT_REFRESH_SECRET: test-refresh-secret-minimum-32-chars
```

---

## Adding New Resource Modules

When a user asks to add a new resource (e.g. `users`, `products`, `orders`):

1. Add model to `prisma/schema.prisma`
2. Create `src/services/<resource>.service.ts`
3. Create `src/controllers/<resource>.controller.ts`
4. Create `src/routes/<resource>.routes.ts`
5. Register router in `src/routes/index.ts`
6. Add unit test in `tests/unit/<resource>.service.test.ts`
7. Add integration test in `tests/integration/<resource>.routes.test.ts`

Follow the same MVC pattern. Never skip the service layer. Never put Prisma calls in controllers.

---

## Zod Schemas (validation layer)

Place schemas co-located with routes or in a `src/schemas/` folder:

```typescript
// src/schemas/auth.schema.ts
import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8).max(128),
    name: z.string().min(1).max(100),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});
```

---

## Testing Conventions

### Unit tests (Jest)
- Mock Prisma with `jest.mock('../config/db')`
- Mock Redis with `jest.mock('../config/redis')`
- Test service functions in isolation
- One `describe` block per service function

### Integration tests (Supertest)
- Use a real test DB (separate `DATABASE_URL` in `.env.test`)
- `beforeAll`: run migrations, seed minimal data
- `afterAll`: disconnect Prisma and Redis
- `beforeEach`: clean tables
- Test happy path + at least 2 error paths per endpoint

---

## Response Envelope

All API responses must use this shape:

```typescript
// Success
{ "status": "success", "data": { ... } }

// Success list
{ "status": "success", "data": { "items": [...], "total": 42 } }

// Error
{ "status": "error", "message": "Human-readable error message" }
```

Never return raw data at the top level. Never expose stack traces in production.

---

## Prisma Schema Conventions

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  password     String
  name         String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("users")
}
```

Rules:
- Always use `cuid()` for IDs
- Always include `createdAt` and `updatedAt`
- Always use `@@map()` with snake_case table names
- Never store plain-text passwords — always hash with bcrypt (rounds: 12)

---

## npm Scripts (package.json)

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "type-check": "tsc --noEmit",
    "test": "jest --runInBand",
    "test:coverage": "jest --coverage --runInBand",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio"
  }
}
```

---

## Security Checklist

Every generated project must satisfy:

- [ ] Helmet middleware applied globally
- [ ] CORS configured (not wildcard in production)
- [ ] Rate limiting on all routes
- [ ] Stricter rate limiting on `/auth/*`
- [ ] Passwords hashed with bcrypt (rounds ≥ 12)
- [ ] JWT secrets minimum 32 chars (enforced by Zod)
- [ ] No secrets in logs (logger strips `password`, `token` fields)
- [ ] `.env` in `.gitignore`
- [ ] Prisma client not exposed outside service layer
- [ ] No `any` in TypeScript (enforced by tsconfig)
