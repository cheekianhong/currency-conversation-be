    # Dockerfile
    FROM node:22-alpine AS builder

    WORKDIR /app

    COPY package*.json ./
    RUN npm ci

    COPY tsconfig.json ./
    COPY src/ ./src/
    COPY src/swagger.ts ./
    COPY prisma/ ./prisma/

    RUN npx prisma generate

    RUN npm run build

    FROM node:22-alpine AS production

    WORKDIR /app

    # Install OpenSSL 1.1 compat library
    RUN apk add --no-cache openssl

    COPY package*.json ./
    RUN npm ci --only=production

    COPY --from=builder /app/dist ./dist
    COPY --from=builder /app/prisma ./prisma
    COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
    COPY prisma/ ./prisma/

    EXPOSE 3000

    CMD ["node", "dist/server.js"]
