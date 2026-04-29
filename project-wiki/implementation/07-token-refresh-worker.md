# 07 — Queue Service: Token Refresh Worker

## Status

**SUPERSEDED** — This ticket has been replaced by the comprehensive queue infrastructure plan at [queue-infrastructure.md](queue-infrastructure.md).

See **Phase 2: Token Refresh** in that document for the updated implementation plan.

Changes from this original spec:
- Job payload no longer includes `provider` — it's derived from the `social_connections` row by `connectionId`
- Token refresh timing is provider-specific via `PROVIDER_TOKEN_CONFIG` (not hardcoded 7 days)
- Worker uses Pino logger from `shared-be` (not queue-service-local)
- `needs_reauth` column on `social_connections` (schema update, Drizzle generates migration)
- CLI app (`apps/cli`) added for manual testing before queue automation
- Token refresh must ship before content sync (content-sync depends on it)

## Original Spec (for reference)

### Goal

Implement the `token.refresh` BullMQ repeatable job that refreshes Instagram access tokens before they expire, updating the encrypted tokens in the database.

### Context

Instagram long-lived tokens expire after 60 days. The token refresh worker must run before expiration, exchange the current token for a new one, re-encrypt it, and update the `social_connections` row. On repeated failures, the worker should mark the connection as needing re-auth.

### Files to Create

- `packages/shared-be/src/providers/instagram/token-refresh.ts` — `refreshInstagramToken(accessToken)` function that calls the Meta Graph API token refresh endpoint
- `packages/shared-be/src/providers/instagram/token-refresh.test.ts` — tests for token refresh
- `apps/queue-service/src/workers/token-refresh.ts` — BullMQ worker that processes `token.refresh` jobs: decrypts token, calls refresh, re-encrypts new token, updates DB
- `apps/queue-service/src/workers/token-refresh.test.ts` — tests for the worker
- `apps/queue-service/src/utils/reauth.ts` — helper to mark a connection as needing re-auth (set a flag or update `token_expires_at` to past date)

### Files to Modify

- `apps/queue-service/src/index.ts` — register `token.refresh` worker and schedule repeatable jobs when connections are created
- `packages/shared-be/src/providers/instagram/index.ts` — export token refresh function

### Acceptance Criteria

- Worker processes `token.refresh` jobs and refreshes Instagram tokens
- Re-encrypts new tokens before saving to database
- Updates `token_expires_at` and `modified_at` on successful refresh
- On failure, retries with exponential backoff (BullMQ default)
- After N consecutive failures, marks connection as needing re-auth
- Repeatable jobs are scheduled when a social connection is created (from OAuth callback)
- `bun run validate` passes with zero errors

### Commit Message

```
feat(queue-service): implemented token refresh worker with re-auth marking

- Added Instagram token refresh to shared-be provider client
- Implemented token-refresh BullMQ worker with encryption
- Marked connections as needing re-auth after repeated failures
- Scheduled repeatable refresh jobs on OAuth connection creation
```