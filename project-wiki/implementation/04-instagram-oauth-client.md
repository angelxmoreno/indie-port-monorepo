# 04 — Instagram OAuth Provider Client

## Goal

Implement the Instagram (Meta Graph API) OAuth client in `packages/shared-be` so that the API can initiate OAuth flows and exchange authorization codes for access/refresh tokens.

## Context

Instagram is the first provider per the provider decisions doc. The API needs to redirect artists to Instagram's OAuth consent screen, handle the callback, and exchange the auth code for tokens. The tokens must be encrypted before storage (using the crypto helpers from ticket 03). This client lives in `shared-be` because both the API and the queue service need to use provider-specific logic.

## Files to Create

- `packages/shared-be/src/providers/instagram/client.ts` — Instagram OAuth client class with `getAuthorizationUrl(state)` and `exchangeCodeForTokens(code)` methods
- `packages/shared-be/src/providers/instagram/types.ts` — Zod schemas for Instagram OAuth response types (token response, error response), derived TypeScript types
- `packages/shared-be/src/providers/instagram/index.ts` — barrel export
- `packages/shared-be/src/providers/index.ts` — barrel export for all providers
- `apps/api/src/routes/oauth/instagram.ts` — Hono route handlers: `GET /oauth/instagram` (redirect to IG consent) and `GET /oauth/instagram/callback` (exchange code, encrypt tokens, save to DB, enqueue content sync)
- `apps/api/src/routes/oauth/index.ts` — mount Instagram OAuth routes
- `packages/shared-be/src/providers/instagram/client.test.ts` — unit tests for authorization URL generation and token exchange

## Files to Modify

- `apps/api/src/index.ts` — mount `/oauth` route group
- `packages/shared-be/src/index.ts` — re-export provider client
- `packages/shared-be/package.json` — add any HTTP client dependencies if needed (Hono's built-in fetch should suffice)

## Files to Reference

- `project-wiki/decisions/providers.md` — Instagram as first provider, Meta Graph API
- `project-wiki/architecture/overview.md` — OAuth + content flow diagram
- `packages/database/src/schema.ts` — `social_connections` table for token storage
- `packages/shared-types/src/index.ts` — `providerSchema`, `socialConnectionSchema`

## Acceptance Criteria

- `GET /oauth/instagram` redirects to Instagram's OAuth consent screen with correct client ID, redirect URI, and scopes
- `GET /oauth/instagram/callback` exchanges the auth code for tokens, encrypts them, and saves to `social_connections`
- Callback enqueues a `content.sync` job via BullMQ
- Invalid or error callbacks return appropriate HTTP error responses
- Token exchange uses the Meta Graph API long-lived token endpoint
- `bun run validate` passes with zero errors

## Commit Message

```
feat(shared-be): implemented Instagram OAuth client and API callback routes

- Added InstagramOAuthClient with authorization URL and token exchange
- Created /oauth/instagram redirect and callback endpoints
- Encrypted tokens before storage using AES-256-GCM helpers
- Enqueued content.sync job on successful OAuth connection
```