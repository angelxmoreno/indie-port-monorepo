# 02 — Supabase Auth Integration

## Goal

Integrate Supabase Auth into the API so that all endpoints can verify JWTs and identify the requesting user. This is the foundation for all authenticated routes (dashboard, OAuth callbacks, artist management).

## Context

The architecture specifies Supabase Auth for user management, but zero auth code exists in the codebase. The API currently has a single unauthenticated `/health` endpoint. All future dashboard and API routes require authenticated Supabase users. The API must validate the `Authorization: Bearer <token>` header, extract the user ID, and make it available to route handlers.

## Files to Create

- `packages/shared-types/src/auth.ts` — Zod schemas for auth-related types (authenticated user, auth error responses)
- `packages/shared-be/src/supabase.ts` — Supabase client initialization (server-side, reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` from env)
- `packages/shared-be/src/auth.ts` — JWT verification helper that extracts user from Supabase JWT
- `apps/api/src/middleware/auth.ts` — Hono middleware that validates the Bearer token, attaches user to context, returns 401 on invalid/missing tokens

## Files to Modify

- `packages/shared-be/src/index.ts` — re-export supabase client and auth helpers
- `packages/shared-types/src/index.ts` — re-export auth schemas
- `apps/api/src/index.ts` — apply auth middleware to protected routes (keep `/health` public)
- `apps/api/package.json` — add `@supabase/supabase-js` dependency
- `packages/shared-be/package.json` — add `@supabase/supabase-js` dependency

## Files to Reference

- `project-wiki/decisions/tech-stack.md` — Supabase Auth decision
- `project-wiki/architecture/overview.md` — auth middleware in system diagram
- `apps/api/src/index.ts` — current Hono app setup

## Acceptance Criteria

- Unauthenticated requests to protected routes return 401
- `/health` remains publicly accessible
- Auth middleware extracts `userId` from valid Supabase JWTs
- Invalid or expired tokens return 401 with clear error message
- `bun run validate` passes with zero errors

## Commit Message

```
feat(api): integrated Supabase auth middleware and JWT verification

- Added Supabase client initialization in shared-be
- Created auth middleware for Hono that validates Bearer tokens
- Kept /health endpoint public, protected all other routes
- Added auth-related Zod schemas to shared-types
```