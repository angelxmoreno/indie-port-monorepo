# Auth Implementation Plan

## Overview

Phone-first authentication using Supabase Auth SMS OTP. No email/password login. Social providers (Instagram, TikTok, YouTube, Spotify, SoundCloud) are content sources only — not auth methods.

## Auth Flow

```
┌──────────┐    phone + OTP     ┌──────────────┐
│  Frontend │ ──────────────────▶│ Supabase Auth │
│  (React)  │◀──────────────────│               │
└────┬─────┘      JWT            └──────┬───────┘
     │                                │
     │ Bearer token                   │
     ▼                                │
┌──────────┐                          │
│  API      │                          │
│  (Hono)   │                          │
└────┬─────┘                          │
     │                                │
     │ Verify JWT + get userId         │
     │ Create artist row if missing   │
     ▼                                │
┌──────────┐                          │
│Database  │◀─────────────────────────┘
│(PG/Drizzle)│
└──────────┘
```

1. FE manages own auth state (Supabase JS client)
2. User enters phone number → FE calls Supabase Auth `signInWithOtp`
3. Supabase sends SMS, user enters OTP → FE gets JWT
4. FE sends JWT in `Authorization: Bearer <token>` header to API
5. BE middleware verifies JWT, extracts `userId`
6. BE checks if `artists` row exists for `userId` — if not, creates one (lazy provisioning)
7. Artist row created without a theme (themeId is nullable, assigned later)

## Key Decisions

- **Auth method**: Phone OTP only. No email/password, no social login buttons.
- **Lazy provisioning**: Artist row created on first authenticated request, not during signup.
- **Content providers are not auth providers**: Instagram, TikTok, etc. are connected after signup for content pulling only.
- **Default theme**: Not needed. `themeId` is nullable on the `artists` table. Artists can be created without a theme and assign one later.

## Schema Changes

### `artists.themeId` — nullable

The `themeId` column on `artists` is nullable (no seed migration needed). Artist rows can be created during lazy provisioning without a theme, and the theme is assigned later via the dashboard.

### `social_connections` — no changes needed

The `providerEnum` already lists content providers. Phone auth doesn't need a provider entry here.

### Potential future: phone number on artist

Supabase Auth stores the phone number in `auth.users`. The `artists.userId` FK links to it. If we need the phone number in the `artists` table for querying without joining to `auth.users`, add a `phone` column later. Not needed now.

## Implementation Tickets

### Ticket A: Supabase Auth Phone Login Setup — ✅ DONE

**Completed:**
- [x] `packages/shared-types/src/auth.ts` — Zod schemas created
- [x] `packages/shared-be/src/supabase.ts` — Supabase client initialization
- [x] `packages/shared-be/src/auth.ts` — JWT verification helper
- [x] `apps/api/src/middleware/auth.ts` — Auth middleware with lazy artist provisioning
- [x] `apps/api/src/middleware/error-handler.ts` — Error handling
- [x] `apps/api/src/index.ts` — Auth middleware applied, CORS added, `/api/me` route
- [x] `packages/shared-fe/src/auth/auth-store.ts` — Zustand auth store with API sync
- [x] `packages/shared-fe/src/api/client.ts` — ApiClient class with Bearer tokens
- [x] `apps/dashboard/src/main.tsx` — ApiClient initialization
- [x] Tests for auth middleware, `/api/me`, `ApiClient`, `verifyToken`
- [x] CORS configured for cross-origin requests
- [x] 401 handling in auth store (signOut on expired token)
- [x] Subdomain uniqueness fix (full userId instead of slice)

### Ticket B: Content Provider Interface — PENDING

### Ticket C: OAuth Token Encryption — PENDING

### Ticket D: Instagram OAuth Provider — PENDING

### Ticket E: Content Sync Worker — PENDING

### Ticket F: Token Refresh Worker — PENDING

**Goal**: Configure Supabase Auth for phone OTP and create the FE auth state management.

**Files to Create**:
- `packages/shared-types/src/auth.ts` — Zod schemas for auth types (phone login request, OTP verification, authenticated user)
- `packages/shared-be/src/supabase.ts` — Supabase client initialization (server-side, reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` from env)
- `packages/shared-be/src/auth.ts` — JWT verification helper that extracts user from Supabase JWT
- `apps/api/src/middleware/auth.ts` — Hono middleware: verify Bearer token, extract userId, lazy-create artist row if missing, attach user to context

**Files to Modify**:
- `packages/shared-be/src/index.ts` — re-export supabase client and auth helpers
- `packages/shared-types/src/index.ts` — re-export auth schemas
- `apps/api/src/index.ts` — apply auth middleware to protected routes (keep `/health` public)
- `apps/api/package.json` — add `@supabase/supabase-js` dependency
- `packages/shared-be/package.json` — add `@supabase/supabase-js` dependency

**Acceptance Criteria**:
- Unauthenticated requests to protected routes return 401
- `/health` remains publicly accessible
- Auth middleware extracts `userId` from valid Supabase JWTs
- First authenticated request for a new user auto-creates an `artists` row (themeId is nullable, assigned later)
- Invalid or expired tokens return 401 with clear error message
- `bun run validate` passes with zero errors

### Ticket B: Content Provider Interface

**Goal**: Define the `ContentProvider` interface in `shared-be` that all content providers implement. Covers OAuth flow, token exchange, token refresh, and content fetching.

**Files to Create**:
- `packages/shared-be/src/providers/types.ts` — `ContentProvider` interface definition:
  ```typescript
  interface ContentProvider {
    getAuthorizationUrl(params: { artistId: string; state: string }): string;
    exchangeCodeForTokens(code: string): Promise<TokenResult>;
    refreshToken(refreshToken: string): Promise<TokenResult>;
    fetchContent(accessToken: string, params: FetchContentParams): Promise<ContentItem[]>;
  }
  ```
- `packages/shared-be/src/providers/errors.ts` — Provider-specific error classes (TokenExpiredError, RateLimitError, ProviderApiError)

**Files to Modify**:
- `packages/shared-be/src/index.ts` — re-export provider interface and types

**Acceptance Criteria**:
- `ContentProvider` interface covers all 4 methods (auth URL, code exchange, token refresh, content fetch)
- Error types distinguish between expired tokens, rate limits, and general API errors
- Each method has proper Zod-validated input/output types
- `bun run validate` passes with zero errors

### Ticket C: OAuth Token Encryption

**Goal**: Implement AES-256-GCM encryption/decryption helpers for OAuth tokens stored in `social_connections`.

**Files to Create**:
- `packages/shared-be/src/crypto.ts` — `encrypt(plaintext, key)` and `decrypt(ciphertext, key)` using AES-256-GCM with `ENCRYPTION_KEY` from env
- `packages/shared-be/src/crypto.test.ts` — unit tests for encrypt/decrypt round-trip

**Files to Modify**:
- `packages/shared-be/src/index.ts` — re-export crypto helpers

**Acceptance Criteria**:
- Encrypt/decrypt round-trips correctly
- Uses AES-256-GCM with a 32-byte key from env
- Ciphertext includes IV + auth tag for tamper detection
- `bun run validate` passes with zero errors

### Ticket D: Instagram OAuth Provider (implements ContentProvider)

**Goal**: Implement the Instagram provider as the first `ContentProvider` implementation.

**Files to Create**:
- `packages/shared-be/src/providers/instagram/client.ts` — InstagramOAuthClient implementing ContentProvider
- `packages/shared-be/src/providers/instagram/types.ts` — Zod schemas for Instagram-specific types
- `packages/shared-be/src/providers/instagram/index.ts` — barrel export
- `apps/api/src/routes/oauth/instagram.ts` — Hono routes: `GET /oauth/instagram` (redirect), `GET /oauth/instagram/callback` (exchange code, encrypt tokens, save to DB, enqueue content sync)
- `packages/shared-be/src/providers/instagram/client.test.ts` — unit tests

**Files to Modify**:
- `packages/shared-be/src/providers/index.ts` — barrel export
- `apps/api/src/index.ts` — mount `/oauth` route group

**Acceptance Criteria**:
- `GET /oauth/instagram` redirects to Instagram consent screen with correct params
- `GET /oauth/instagram/callback` exchanges code, encrypts tokens, saves to `social_connections`, enqueues `content.sync`
- `ContentProvider` interface is fully implemented
- `bun run validate` passes with zero errors

### Ticket E: Content Sync Worker (Instagram)

**Goal**: Implement `content.sync` BullMQ worker that fetches Instagram content and upserts into `content` table.

**Files to Create**:
- `packages/shared-be/src/providers/instagram/content.ts` — fetchInstagramContent function
- `packages/shared-be/src/providers/instagram/content.test.ts` — tests
- `apps/queue-service/src/workers/content-sync.ts` — BullMQ worker
- `apps/queue-service/src/workers/content-sync.test.ts` — tests

**Files to Modify**:
- `apps/queue-service/src/index.ts` — register content-sync worker

**Acceptance Criteria**:
- Worker fetches Instagram media, normalizes into common content shape, upserts into DB
- Updates `synced_at` on success
- Handles API errors and rate limits gracefully
- `bun run validate` passes with zero errors

### Ticket F: Token Refresh Worker (Instagram)

**Goal**: Implement `token.refresh` BullMQ repeatable job for Instagram token refresh.

**Files to Create**:
- `packages/shared-be/src/providers/instagram/token-refresh.ts` — refreshInstagramToken function
- `packages/shared-be/src/providers/instagram/token-refresh.test.ts` — tests
- `apps/queue-service/src/workers/token-refresh.ts` — BullMQ worker
- `apps/queue-service/src/workers/token-refresh.test.ts` — tests
- `apps/queue-service/src/utils/reauth.ts` — helper to mark connection needing re-auth

**Files to Modify**:
- `apps/queue-service/src/index.ts` — register token-refresh worker, schedule repeatable jobs

**Acceptance Criteria**:
- Refreshes Instagram tokens, re-encrypts, updates DB
- Retries with exponential backoff on failure
- Marks connection as needing re-auth after N failures
- `bun run validate` passes with zero errors

## Impact on Existing Tickets

| Existing Ticket | Change |
|----------------|--------|
| 02 — Supabase Auth | Replaced by Ticket A (now phone OTP, lazy artist provisioning) |
| 03 — OAuth Token Encryption | Unchanged, now Ticket C |
| 04 — Instagram OAuth | Now implements ContentProvider interface, Ticket D |
| 05 — API CRUD Routes | Add lazy artist provisioning to auth middleware |
| 06 — Content Sync | Unchanged, now Ticket E |
| 07 — Token Refresh | Unchanged, now Ticket F |
| 11 — Shared Packages | `shared-be` needs ContentProvider interface (Ticket B) |

## Environment Variables Required

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ENCRYPTION_KEY=          # 32-byte hex key for AES-256-GCM
INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=
```