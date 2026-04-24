# 12 — Staging Infrastructure & Deployment

## Goal

Set up the staging deployment pipeline so the app can be deployed to a home server via Dokploy for testing and integration validation.

## Context

The tech stack specifies staging on a home server via Dokploy and production on Hetzner VPS + Dokploy. Before deploying, the apps need production-ready configs (Astro adapter selection, environment variable management, Docker configs). This ticket covers staging only — production deployment is a separate concern.

## Files to Create

- `docker-compose.yml` (root) — development stack: PostgreSQL, Redis, Supabase (or just PG + Redis if Supabase runs separately)
- `apps/api/Dockerfile` — multi-stage build for the Hono API
- `apps/queue-service/Dockerfile` — multi-stage build for the BullMQ workers
- `apps/portfolios/Dockerfile` — multi-stage build for Astro SSR
- `apps/marketing-site/Dockerfile` — build-only (static output served by nginx or CDN)
- `.env.example` — template with all required environment variables documented
- `apps/api/src/config.ts` — centralized config module that reads validated env vars using shared-be's env validation

## Files to Modify

- `apps/portfolios/astro.config.mjs` — add Astro SSR adapter (e.g., `@astrojs/node`) now that deployment target is known
- `apps/portfolios/package.json` — add SSR adapter dependency
- `turbo.json` — add Docker-aware build configs if needed
- `.github/workflows/ci.yml` — add Docker build step to validate containers build successfully

## Files to Reference

- `project-wiki/decisions/tech-stack.md` — infrastructure decisions (Dokploy, Supabase, Redis, Cloudflare)
- `project-wiki/architecture/overview.md` — system diagram for service dependencies

## Acceptance Criteria

- `docker compose up` starts PostgreSQL and Redis locally
- All apps build their Docker images successfully
- `apps/api/src/config.ts` validates and exposes all required env vars
- Portfolios app has a valid SSR adapter configured
- `.env.example` documents every required variable with descriptions
- CI workflow validates Docker builds
- `bun run validate` passes with zero errors

## Commit Message

```
feat(infra): added Docker configs, compose stack, and env validation

- Created Dockerfiles for api, queue-service, portfolios, and
  marketing-site
- Added docker-compose.yml with PostgreSQL and Redis
- Centralized API config with env validation
- Configured portfolios Astro SSR adapter for deployment
- Added .env.example documenting all required variables
```