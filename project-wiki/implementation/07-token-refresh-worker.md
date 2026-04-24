# 07 — Queue Service: Token Refresh Worker

## Goal

Implement the `token.refresh` BullMQ repeatable job that refreshes Instagram access tokens before they expire, updating the encrypted tokens in the database.

## Context

Instagram long-lived tokens expire after 60 days. The token refresh worker must run before expiration, exchange the current token for a new one, re-encrypt it, and update the `social_connections` row. On repeated failures, the worker should mark the connection as needing re-auth.

## Files to Create

- `packages/shared-be/src/providers/instagram/token-refresh.ts` — `refreshInstagramToken(accessToken)` function that calls the Meta Graph API token refresh endpoint
- `packages/shared-be/src/providers/instagram/token-refresh.test.ts` — tests for token refresh
- `apps/queue-service/src/workers/token-refresh.ts` — BullMQ worker that processes `token.refresh` jobs: decrypts token, calls refresh, re-encrypts new token, updates DB
- `apps/queue-service/src/workers/token-refresh.test.ts` — tests for the worker
- `apps/queue-service/src/utils/reauth.ts` — helper to mark a connection as needing re-auth (set a flag or update `token_expires_at` to past date)

## Files to Modify

- `apps/queue-service/src/index.ts` — register `token.refresh` worker and schedule repeatable jobs when connections are created
- `packages/shared-be/src/providers/instagram/index.ts` — export token refresh function

## Files to Reference

- `project-wiki/architecture/content-flow.md` — token refresh flow
- `project-wiki/decisions/providers.md` — Instagram token lifetime (60 days)
- `packages/database/src/schema.ts` — `social_connections` table, `token_expires_at` column

## Acceptance Criteria

- Worker processes `token.refresh` jobs and refreshes Instagram tokens
- Re-encrypts new tokens before saving to database
- Updates `token_expires_at` and `modified_at` on successful refresh
- On failure, retries with exponential backoff (BullMQ default)
- After N consecutive failures, marks connection as needing re-auth
- Repeatable jobs are scheduled when a social connection is created (from OAuth callback)
- `bun run validate` passes with zero errors

## Commit Message

```
feat(queue-service): implemented token refresh worker with re-auth marking

- Added Instagram token refresh to shared-be provider client
- Implemented token-refresh BullMQ worker with encryption
- Marked connections as needing re-auth after repeated failures
- Scheduled repeatable refresh jobs on OAuth connection creation
```