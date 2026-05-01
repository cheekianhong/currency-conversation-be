# Currency Conversation BE

## Live URL

[https://currency-conversation-be.onrender.com](https://currency-conversation-be.onrender.com)

---

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
NODE_ENV=development
PORT=3001
OPENEXCHANGERATES_APP_ID=...
JWT_ACCESS_SECRET=your-access-secret-min-32-chars-long-here
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars-long-here
REDIS_HOST=...
REDIS_PORT=6379
```

> ⚠️ Replace `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` with secure random strings of at least 32 characters before running in production.

---

## Example Request

```bash
GET /api/convert/countries
GET /api/rates
GET /api/convert?from=USD&to=EUR
GET /api/convert?from=USD&to=EUR&amount=100
```

---

## Getting Started

Follow these steps in order to start the project:

### 1. Install dependencies

```bash
npm i
```

### 2. Generate Prisma client (if needed)

```bash
npm run prisma:generate
```

### 3. Start redis server (if not starting yet)

### 4. Start the development server

```bash
npm run dev
```

---

## Project Prompt

The following prompt was used to scaffold this project:

```
You are an expert Node.js/TypeScript engineer. Generate a complete, production-ready Express.js REST API project. Follow every instruction exactly and produce deterministic, consistent output.
## HARD CONSTRAINTS (never deviate)
- Runtime: Node.js 22 (ES2022 target)
- Language: TypeScript 5.x — strict mode ON, no `any`, no implicit types
- Architecture: MVC (Model → Controller → Service)
- Package manager: npm
- All async code uses async/await (no callbacks, no raw Promises)
- All environment variables must be validated at startup using Zod
## TECH STACK (exact versions)
- express ^4.19
- typescript ^5.4
- prisma ^5.x + @prisma/client (MySQL adapter)
- ioredis ^5.x
- jsonwebtoken ^9.x
- zod ^3.x
- winston ^3.x + morgan ^1.x
- swagger-ui-express + swagger-jsdoc
- express-rate-limit ^7.x
- jest ^29.x + supertest ^7.x + ts-jest
- eslint ^9.x + prettier ^3.x
- dotenv ^16.x
## FOLDER STRUCTURE (output exactly this)
src/
  config/         ← env.ts (Zod-validated config), db.ts, redis.ts
  controllers/    ← one file per resource (e.g. auth.controller.ts)
  services/       ← one file per resource (e.g. auth.service.ts)
  models/         ← Prisma schema only (schema.prisma at root)
  middlewares/    ← auth.middleware.ts, error.middleware.ts, validate.middleware.ts, rateLimit.middleware.ts
  routes/         ← index.ts (router aggregator), auth.routes.ts, user.routes.ts
  utils/          ← logger.ts (Winston), httpStatus.ts, AppError.ts
  types/          ← express.d.ts (augmented Request), jwt.types.ts
  app.ts          ← Express app factory (no listen here)
  server.ts       ← listen() + graceful shutdown
tests/
  unit/
  integration/
.env.example
docker-compose.yml
Dockerfile
.github/workflows/ci.yml
swagger.ts
## BEST PRACTICES TO IMPLEMENT
1. Strict TypeScript: tsconfig.json with strict:true, noImplicitAny, strictNullChecks
2. MVC separation: controllers only call services, services only call Prisma/Redis
3. Centralized error handling: AppError class extends Error; global error middleware catches all
4. Env validation: parse process.env with Zod schema in config/env.ts; crash-fast on missing vars
5. Request validation middleware: generic validate(schema) middleware using Zod, applied per route
6. Async safety: wrap all async route handlers with asyncHandler() utility to forward errors
7. HTTP status constants: use named constants (HTTP_STATUS.OK, HTTP_STATUS.NOT_FOUND) never raw numbers
8. JWT strategy: issue short-lived access token (15m) + long-lived refresh token (7d); store refresh in Redis
9. Redis caching: cache GET responses with TTL; invalidate on mutation
10. Structured logging: Winston with JSON format in production, colorized in development; Morgan uses Winston stream
11. Rate limiting: express-rate-limit on all routes; stricter limit on /auth/* routes
12. Graceful shutdown: listen for SIGTERM/SIGINT; close HTTP server, Prisma, and Redis before exit
## OUTPUT FORMAT
Generate files one at a time in this exact order:
1. package.json
2. tsconfig.json
3. .env.example
4. prisma/schema.prisma
5. src/config/env.ts
6. src/config/db.ts
7. src/config/redis.ts
8. src/utils/AppError.ts
9. src/utils/httpStatus.ts
10. src/utils/logger.ts
11. src/utils/asyncHandler.ts
12. src/middlewares/error.middleware.ts
13. src/middlewares/validate.middleware.ts
14. src/middlewares/auth.middleware.ts
15. src/middlewares/rateLimit.middleware.ts
16. src/types/express.d.ts
17. src/controllers/auth.controller.ts
18. src/services/auth.service.ts
19. src/routes/auth.routes.ts
20. src/routes/index.ts
21. src/app.ts
22. src/server.ts
23. swagger.ts
24. Dockerfile
25. docker-compose.yml
26. .github/workflows/ci.yml
27. tests/unit/auth.service.test.ts
28. tests/integration/auth.routes.test.ts
29. .eslintrc.json + .prettierrc
For each file: print the filename as a comment on line 1, then the full file contents. Do not truncate. Do not add explanations between files. Output all files completely before stopping.
```
