FROM oven/bun:1-alpine AS base
WORKDIR /app

# Stage 1: Install dependencies
FROM base AS deps
COPY package.json bun.lock ./
COPY packages/mukti-api/package.json packages/mukti-api/
COPY packages/mukti-web/package.json packages/mukti-web/
RUN bun install 

# Stage 2: Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
WORKDIR /app/packages/mukti-web
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# Stage 3: Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Add user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set correct permissions
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone build
# The standalone build puts the server at .next/standalone/packages/mukti-web/server.js
COPY --from=builder --chown=nextjs:nodejs /app/packages/mukti-web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/packages/mukti-web/.next/static ./packages/mukti-web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/packages/mukti-web/public ./packages/mukti-web/public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "packages/mukti-web/server.js"]
