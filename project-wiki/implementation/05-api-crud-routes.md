# 05 — API Auth Middleware & CRUD Routes

## Goal

Implement the core REST API routes for artist management, social connections, and content retrieval. All routes require auth (except `/health` and OAuth callbacks).

## Context

The API currently has only `/health`. Artists need CRUD endpoints to manage their profile, view/delete social connections, and list their content. These routes depend on auth middleware (ticket 02) and the database schema.

## Files to Create

- `apps/api/src/routes/artists.ts` — `GET /me` (current artist profile), `PATCH /me` (update subdomain, custom domain, theme)
- `apps/api/src/routes/connections.ts` — `GET /me/connections` (list social connections), `DELETE /me/connections/:id` (soft-delete a connection)
- `apps/api/src/routes/content.ts` — `GET /me/content` (list content, filterable by category and provider)
- `apps/api/src/middleware/error-handler.ts` — global error handler for Hono with structured JSON error responses
- `packages/shared-types/src/api/` — request/response Zod schemas for each endpoint

## Files to Modify

- `apps/api/src/index.ts` — mount all artist routes under `/artists` prefix, so routes compose to `/artists/me`, `/artists/me/connections`, and `/artists/me/content`. Also enqueue `content-sync` and `token-refresh` BullMQ jobs on OAuth connection creation
- `packages/shared-types/src/index.ts` — re-export API schemas

## Files to Reference

- `project-wiki/architecture/overview.md` — system diagram showing API responsibilities
- `packages/database/src/schema.ts` — table definitions for queries
- `packages/database/src/filters.ts` — `notDeleted()` helper for filtering
- `packages/shared-types/src/index.ts` — existing domain schemas

## Acceptance Criteria

- All endpoints require valid Supabase JWT (return 401 without)
- `GET /artists/me` returns the authenticated artist's profile
- `PATCH /artists/me` updates allowed fields and returns updated profile
- `GET /artists/me/connections` lists active (non-deleted) social connections
- `DELETE /artists/me/connections/:id` soft-deletes the connection (sets `deleted_at`) and removes scheduled BullMQ jobs for that connection
- `GET /artists/me/connections` includes `needs_reauth` flag so dashboard can show reconnect prompts
- `GET /artists/me/content` returns paginated content, filterable by `category` and `provider` query params
- Error responses follow a consistent `{ error: string, code: string }` format
- `bun run validate` passes with zero errors

## Commit Message

```
feat(api): implemented artist, connection, and content CRUD routes

- Added /artists/me, /artists/me/connections, and /artists/me/content endpoints
- All routes protected by Supabase auth middleware
- Soft-delete on connection removal removes scheduled BullMQ jobs
- Structured error responses via global error handler
```