<!-- Context: development/infrastructure/docker | Priority: high | Version: 1.0 | Updated: 2026-03-21 -->

# Docker — Mukti Local Infrastructure

**Purpose**: Docker Compose services, env vars, and startup order for local development and production

---

## Services (`docker-compose.yml`)

| Service   | Image / Source                    | Port  | Purpose                        |
| --------- | --------------------------------- | ----- | ------------------------------ |
| `mongodb` | `mongo:7`                         | 27017 | Primary database (db: `mukti`) |
| `redis`   | `redis:7-alpine`                  | 6379  | BullMQ queue backend           |
| `seed`    | Built from `mukti-api/Dockerfile` | —     | One-time DB seed (exits after) |
| `api`     | Built from `mukti-api/Dockerfile` | 3000  | NestJS backend                 |
| `web`     | Built from `mukti-web/Dockerfile` | 3001  | Next.js frontend               |

**Startup order**: `mongodb` + `redis` (healthcheck) → `seed` (wait for completion) → `api` → `web`

---

## Dev Setup (local databases only)

For local development, typically only run the infrastructure services:

```bash
docker compose up mongodb redis -d    # Start just databases
bun nx run @mukti/api:serve           # API in watch mode (hot reload)
bun nx run @mukti/web:dev             # Web in dev mode
```

---

## Full Stack (production-like)

```bash
docker compose up --build -d    # Build and start all services
docker compose logs -f api web  # Follow logs
docker compose down             # Stop all
docker compose down -v          # Stop + remove volumes (deletes data)
```

---

## Key Environment Variables

| Variable                 | Default                         | Description                                  |
| ------------------------ | ------------------------------- | -------------------------------------------- |
| `MONGODB_URI`            | `mongodb://mongodb:27017/mukti` | MongoDB connection string                    |
| `REDIS_HOST`             | `redis`                         | Redis hostname                               |
| `REDIS_PORT`             | `6379`                          | Redis port                                   |
| `REDIS_PASSWORD`         | _(empty)_                       | Redis auth password                          |
| `JWT_SECRET`             | `dev-secret`                    | JWT access token secret                      |
| `JWT_EXPIRES_IN`         | `15m`                           | Access token TTL                             |
| `JWT_REFRESH_SECRET`     | `dev-refresh-secret`            | Refresh token secret                         |
| `JWT_REFRESH_EXPIRES_IN` | `30d`                           | Refresh token TTL                            |
| `OPENROUTER_API_KEY`     | _(required)_                    | Server-side OpenRouter key                   |
| `FRONTEND_URL`           | `http://localhost:3001`         | Public frontend URL (for email links)        |
| `CORS_ORIGINS`           | `http://localhost:3001`         | Allowed CORS origins (comma-separated)       |
| `COOKIE_DOMAIN`          | `localhost`                     | Cookie domain (prod: `mukti.chat`)           |
| `API_URL`                | `http://localhost:3000`         | Public API URL                               |
| `NEXT_PUBLIC_API_URL`    | `http://localhost:3000/api/v1`  | Browser-facing API URL (baked at build time) |
| `SESSION_SECRET`         | _(required)_                    | Express session secret (CSRF)                |

**Rules**:

- `COOKIE_DOMAIN` defaults to `mukti.chat` in production — set explicitly in dev
- `NEXT_PUBLIC_API_URL` is baked at Next.js build time via `--build-arg`
- CSRF is production-only — `NODE_ENV=production` enables it

---

## Volumes

```yaml
volumes:
  mongo_data: # MongoDB data persistence
  redis_data: # Redis data persistence
```

---

## Health Checks

- **MongoDB**: `mongosh --eval "db.adminCommand('ping')"` every 10s
- **Redis**: `redis-cli ping` every 10s

Services only start when dependencies pass health checks.

---

## Codebase References

- Full compose: `docker-compose.yml` (workspace root)
- API Dockerfile: `packages/mukti-api/Dockerfile`
- Web Dockerfile: `packages/mukti-web/Dockerfile`
