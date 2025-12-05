FROM oven/bun:1 AS base
WORKDIR /app

# Stage 1: Install all dependencies for build
FROM base AS deps
COPY package.json bun.lock ./
COPY packages/mukti-api/package.json packages/mukti-api/
COPY packages/mukti-web/package.json packages/mukti-web/
RUN bun install

# Stage 2: Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
WORKDIR /app/packages/mukti-api
# Build the API
RUN bun run build

# Stage 3: Install production dependencies
FROM base AS prod-deps
COPY package.json bun.lock ./
COPY packages/mukti-api/package.json packages/mukti-api/
COPY packages/mukti-web/package.json packages/mukti-web/
RUN bun install

# Stage 4: Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy production dependencies
COPY --from=prod-deps --chown=bun:bun /app/node_modules ./node_modules

# Copy built artifacts from builder
COPY --from=builder --chown=bun:bun /app/packages/mukti-api/dist ./dist
COPY --from=builder --chown=bun:bun /app/packages/mukti-api/package.json ./

EXPOSE 3000

USER bun

CMD ["bun", "dist/main.js"]
