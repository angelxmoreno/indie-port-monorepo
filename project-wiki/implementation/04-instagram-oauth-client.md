# 04 — Instagram OAuth Provider Client

## Status

✅ DONE

## Goal

Implement the Instagram (Meta Graph API) OAuth client in `packages/shared-be` so that the API can initiate OAuth flows and exchange authorization codes for access/refresh tokens.

## Context

Instagram is the first provider per the provider decisions doc. The API needs to redirect artists to Instagram's OAuth consent screen, handle the callback, and exchange the auth code for tokens. The tokens must be encrypted before storage (using the crypto helpers from ticket 03). This client lives in `shared-be` because both the API and the queue service need to use provider-specific logic.

## Files Created

- `packages/shared-be/src/providers/instagram/client.ts` — `InstagramContentProvider` class implementing `ContentProvider`
  - `getAuthorizationUrl(params)` — builds Instagram OAuth consent URL
  - `exchangeCodeForTokens(code)` — exchanges auth code for short-lived token, then long-lived token
  - `refreshToken(refreshToken)` — refreshes a long-lived token
  - `fetchContent(accessToken, params)` — fetches media from `/me/media` with pagination
  - `mapToContentItem(item)` — normalizes Instagram media into `ContentItem` (splits caption on newline into title/description)
- `packages/shared-be/src/providers/instagram/types.ts` — Zod schemas for Instagram API responses
  - `instagramShortLivedTokenSchema`
  - `instagramLongLivedTokenSchema`
  - `instagramMediaItemSchema`
  - `instagramMediaSchema`
- `packages/shared-be/src/providers/instagram/index.ts` — barrel export
- `packages/shared-be/src/providers/instagram/client.test.ts` — 13 unit tests covering auth URL, token exchange, refresh, content fetch, error handling, and caption splitting

## Files Modified

- `apps/api/src/index.ts` — added `requireEnv()` helper and two OAuth routes:
  - `GET /api/oauth/instagram` (protected) — looks up artist by `userId`, encrypts state, returns `{ authUrl }`
  - `GET /api/oauth/instagram/callback` (public, mounted before auth middleware) — decrypts state, exchanges code, encrypts tokens, upserts into `social_connections`, redirects to dashboard
- `packages/shared-be/src/index.ts` — re-export `InstagramContentProvider` and Instagram types
- `apps/api/.env.example` — added `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET`, `INSTAGRAM_REDIRECT_URI`, `DASHBOARD_URL`

## Design Notes

- Routes live directly in `apps/api/src/index.ts` instead of separate route files (simpler for two-endpoint feature)
- State parameter is encrypted with AES-256-GCM and contains `{ artistId, nonce, issuedAt }`. Expires after 10 minutes.
- Tokens are encrypted with AES-256-GCM before storage in `social_connections`
- `onConflictDoUpdate` is used for atomic upsert on `(artist_id, provider)` with `targetWhere` matching the partial unique index (`deleted_at IS NULL`)
- Content sync enqueue (BullMQ) is pending Ticket E
- No separate `packages/shared-be/src/providers/index.ts` was needed — `shared-be/src/index.ts` imports directly from `./providers/instagram`

## Acceptance Criteria

- [x] `GET /api/oauth/instagram` returns an encrypted-state Instagram OAuth URL
- [x] `GET /api/oauth/instagram/callback` exchanges code, encrypts tokens, saves to `social_connections`
- [x] Invalid/expired state returns dashboard redirect with error
- [x] Token exchange uses the Meta Graph API long-lived token endpoint
- [x] `bun run validate` passes with zero errors

## Commit Message

```
feat(api,shared-be): implemented Instagram OAuth provider and API routes

Added InstagramContentProvider to shared-be with short-lived and long-lived token exchange,
refresh, and content fetch. Included Zod schemas and unit tests for all provider methods.

Added /api/oauth/instagram and /api/oauth/instagram/callback routes to the API with encrypted
state parameter for CSRF protection. Tokens are encrypted with AES-256-GCM and upserted into
social_connections via Drizzle. Updated .env.example with new Instagram OAuth variables.
```
