# Queue Infrastructure Implementation Plan

## Overview

BullMQ + Redis queue service for content sync and token refresh. Redis already justified for caching, so BullMQ adds no new infra dependency. Workers run as long-lived processes in the `queue-service` app alongside Hono API in Docker/VPS deployment.

## Architecture

```
┌──────────┐  enqueue    ┌───────────┐  process    ┌────────────────┐
│  API     │────────────▶│  Redis    │◀───────────│  queue-service  │
│  (Hono)  │             │  (BullMQ) │             │  (Workers)      │
└──────────┘             └───────────┘             └──────┬─────────┘
                                                          │
                                     ┌────────────────────┼──────────────────┐
                                     │                    │                  │
                                     ▼                    ▼                  ▼
                              content-sync         token-refresh      future workers
                              (per connection)     (per connection)   (per need)
```

### Job Lifecycle

1. **Enqueue** — API (or scheduler) adds job to BullMQ queue
2. **Process** — Worker picks up job, executes business logic
3. **Retry** — On transient failure, BullMQ retries with exponential backoff
4. **Complete/Fail** — Job marked completed or moved to failed queue
5. **Cleanup** — Completed jobs pruned after configurable retention

## Queues & Workers

### 1. `content-sync` Queue

**Purpose**: Fetch content from provider APIs and upsert into `content` table.

**Job payload**:
```typescript
{
  artistId: string;    // UUID - references artists.id
  provider: string;    // 'instagram' | 'tiktok' | 'youtube' | 'spotify' | 'soundcloud'
}
```

**Job options**:
- `jobId`: `{artistId}:{provider}` — deduplicates concurrent syncs for same artist+provider
- `removeOnComplete`: 1000 — keep last 1000 completed jobs for debugging
- `removeOnFail`: 5000 — keep last 5000 failed jobs
- `attempts`: 3 — retry up to 3 times on transient failure
- `backoff`: exponential, starting at 5s, max 5min
- `limiter`: max 200 jobs per 3600000ms (1hr) per worker — respects IG rate limits

**Worker flow**:
1. Look up `social_connections` row by `artistId + provider`
2. Decrypt `access_token` using `ENCRYPTION_KEY`
3. Check `token_expires_at` — if expired, enqueue `token-refresh` job and fail with retry
4. Call provider's `fetchContent()` with decrypted token and pagination params
5. Normalize returned items into `content` table shape
6. Upsert each item using `onConflictDoUpdate` on `(artist_id, provider, external_id)` where `deleted_at IS NULL`
7. Update `synced_at` on `social_connections` row
8. Log: artistId, provider, items synced, errors

**Error handling**:
| Error type | Action |
|------------|--------|
| `RateLimitError` | Fail job with delay = `retryAfterMs` (BullMQ `DelayedError`) |
| `TokenExpiredError` | Enqueue `token-refresh` job, then fail current job (retry after token refresh) |
| `ProviderApiError` (5xx) | Retry with exponential backoff |
| `ProviderApiError` (4xx, not 429/401) | Fail job, log error, alert |
| Network timeout | Retry with exponential backoff |

**Scheduling**:
- Repeatable job per active `social_connection`: every 30 minutes
- Initial sync enqueued immediately when OAuth connection created (from API callback)
- Scheduler runs on queue-service startup and re-schedules on connection creation

---

### 2. `token-refresh` Queue

**Purpose**: Refresh provider access tokens before they expire. Re-encrypt and update `social_connections`.

**Job payload**:
```typescript
{
  connectionId: string;  // UUID - references social_connections.id
  // provider is derived from the social_connections row — no need to pass it
}
```

**Job options**:
- `jobId`: `token-refresh:{connectionId}` — dedup
- `removeOnComplete`: 500
- `removeOnFail`: 2000
- `attempts`: 3
- `backoff`: exponential, starting at 10min, max 1hr

**Worker flow**:
1. Look up `social_connections` row by `id` (includes `provider` column)
2. Decrypt `refresh_token` (for IG, this is the same as access token)
3. Call provider's `refreshToken()` with decrypted token
4. Re-encrypt new `accessToken` and `refreshToken`
5. Update `social_connections` row: `access_token`, `refresh_token`, `token_expires_at`, `modified_at`
6. Log: connectionId, provider, new expiry

**Error handling**:
| Error type | Action |
|------------|--------|
| `TokenExpiredError` (refresh token dead) | Mark connection as needing re-auth (see below), fail job with no retry |
| `RateLimitError` | Delay retry by `retryAfterMs` |
| `ProviderApiError` (5xx) | Retry with backoff |
| `ProviderApiError` (4xx) | Mark connection as needing re-auth, fail job |

**Re-auth flagging**:
- After 3 consecutive token-refresh failures, mark connection as needing re-auth
- Implementation: add `needs_reauth` boolean column to `social_connections` (nullable, default false)
- When `needs_reauth = true`, the API returns a flag in the dashboard connections endpoint
- Dashboard shows "Reconnect" button for flagged connections
- Successful OAuth reconnection resets `needs_reauth = false`
- Content-sync worker skips connections where `needs_reauth = true`

**Scheduling**:
- Repeatable job per `social_connection`: calculated as `token_expires_at - REFRESH_BUFFER`
- `REFRESH_BUFFER` is provider-specific (see Provider Token Config below)
- On connection creation, API enqueues repeatable refresh job with calculated delay

**Provider Token Config**:
```typescript
const PROVIDER_TOKEN_CONFIG = {
  instagram: { ttlDays: 60, refreshBufferDays: 7 },   // refresh at day 53
  tiktok:    { ttlDays: 30, refreshBufferDays: 3 },   // placeholder
  youtube:   { ttlDays: 90, refreshBufferDays: 7 },   // placeholder
  spotify:   { ttlDays: 60, refreshBufferDays: 7 },    // placeholder
  soundcloud: { ttlDays: 30, refreshBufferDays: 3 },   // placeholder
} as const;
```
Only `instagram` is implemented now. Other providers will fill in real values when integrated.

---

### 3. Future Queues (not implemented now, documented for awareness)

| Queue | Purpose | Trigger |
|-------|---------|---------|
| `content-delete` | Mark content as deleted when removed from provider | Detected during content-sync (item missing from provider response) |
| `notification` | Send push/email notifications to artists | Sync complete, token expiring, re-auth needed |

These are NOT part of this implementation. Listed to inform design decisions (e.g., job ID naming conventions, shared connection module).

## Job Enqueue Examples

### From API — Initial content sync after OAuth connection

```typescript
// apps/api/src/routes/oauth/instagram/callback.ts
import { contentSyncQueue } from '@indieport/queue-service/queues';

// After successful OAuth token exchange + DB save:
await contentSyncQueue.add(
  'content-sync',
  { artistId: artist.id, provider: 'instagram' },
  {
    jobId: `${artist.id}:instagram`,
    removeOnComplete: 1000,
    removeOnFail: 5000,
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  }
);
```

### From API — Schedule token refresh on connection creation

```typescript
// apps/api/src/routes/oauth/instagram/callback.ts
import { tokenRefreshQueue } from '@indieport/queue-service/queues';
import { PROVIDER_TOKEN_CONFIG } from '@indieport/shared-be/providers';

// After saving social_connection with tokenExpiresAt:
const bufferMs = PROVIDER_TOKEN_CONFIG.instagram.refreshBufferDays * 24 * 60 * 60 * 1000;
const delay = tokenExpiresAt.getTime() - Date.now() - bufferMs;

await tokenRefreshQueue.add(
  'token-refresh',
  { connectionId: connection.id },
  {
    jobId: `token-refresh:${connection.id}`,
    delay: Math.max(0, delay),
    attempts: 3,
    backoff: { type: 'exponential', delay: 600000 },
  }
);
```

### From Scheduler — Repeatable content sync

```typescript
// apps/queue-service/src/utils/scheduler.ts
import { contentSyncQueue } from '../queues';

async function scheduleContentSync(artistId: string, provider: string) {
  await contentSyncQueue.add(
    'content-sync',
    { artistId, provider },
    {
      jobId: `${artistId}:${provider}`,
      repeat: { every: 1800000 }, // 30 min
      removeOnComplete: 1000,
      removeOnFail: 5000,
    }
  );
}
```

### From CLI — Manual trigger

```typescript
// apps/cli/src/commands/sync-content.ts
import { fetchInstagramContent } from '@indieport/shared-be/providers/instagram';
import { getConnection } from '@indieport/queue-service/utils/connection';

// No queue — runs directly, prints results
export async function syncContent(artistId: string, provider: string) {
  const connection = await getConnection(artistId, provider);
  const content = await fetchInstagramContent(connection.accessToken);
  // upsert to DB...
  console.log(`Synced ${content.length} items for ${provider}`);
}
```

## Shared Modules

### `packages/shared-be/src/logger.ts`

Pino logger — shared across all BE services (API, queue-service, CLI).

- `createLogger(service: string)` — returns a Pino child logger with `service` field
- Workers pass `queue` and `worker` fields via child loggers
- CLI uses pretty-print transport for dev readability

### `apps/queue-service/src/utils/`

```
utils/
├── connection.ts     # DB lookup, decrypt tokens, check re-auth status
├── reauth.ts         # Mark connection as needing re-auth
└── scheduler.ts      # Register/unregister repeatable jobs
```

**connection.ts** — shared utility used by both workers:
- `getConnection(artistId, provider)` — query `social_connections`, return decrypted tokens
- `isTokenExpiring(tokenExpiresAt)` — returns true if token expires within threshold (default: 1 hour)
- `isReauthNeeded(connection)` — returns `needs_reauth` flag

**reauth.ts** — re-auth flagging:
- `markForReauth(connectionId, reason)` — sets `needs_reauth = true`, logs reason
- `clearReauth(connectionId)` — resets `needs_reauth = false` after successful reconnection

**scheduler.ts** — repeatable job management:
- `scheduleContentSync(connectionId, artistId, provider)` — registers 30min repeatable content-sync job
- `scheduleTokenRefresh(connectionId, provider, tokenExpiresAt)` — registers one-time token-refresh job at `tokenExpiresAt - PROVIDER_TOKEN_CONFIG[provider].refreshBufferDays`
- `removeScheduledJobs(connectionId)` — removes repeatable jobs when connection is deleted

**logger.ts** — Pino structured logging (in `shared-be`, shared across all BE services):
- `createLogger(service: string)` — returns Pino child logger with `service` field
- Workers create child loggers with `queue` and `worker` fields
- CLI uses pretty-print transport for dev readability

## Database Schema Changes

Add `needs_reauth` column to `social_connections` in `packages/database/src/schema.ts`:

```typescript
needsReauth: boolean('needs_reauth').notNull().default(false),
```

No manual migrations — update schema, run `bunx drizzle-kit generate` to produce migration file.

## Environment Variables

Add to `apps/queue-service/.env`:

```
REDIS_HOST=localhost
REDIS_PORT=6379
ENCRYPTION_KEY=<same 32-byte hex key as API>
DATABASE_URL=<same as API>
```

The `ENCRYPTION_KEY` must be the same key used by the API for encrypting OAuth tokens. Workers need it to decrypt tokens for API calls.

## File Structure

```
apps/cli/
├── src/
│   ├── index.ts                    # CLI entry point — NovaDI composition root, argument parsing
│   └── commands/
│       ├── sync-content.ts         # Manually trigger content sync
│       ├── refresh-token.ts        # Manually trigger token refresh
│       └── list-connections.ts      # Debug: list connections for an artist
├── package.json
└── tsconfig.json

```
apps/queue-service/
├── src/
│   ├── index.ts                    # App entry — NovaDI composition root, register workers, schedulers, graceful shutdown
│   ├── queues.ts                   # Queue definitions (content-sync, token-refresh)
│   ├── workers/
│   │   ├── content-sync.ts         # Content sync worker logic
│   │   └── token-refresh.ts        # Token refresh worker logic
│   └── utils/
│       ├── connection.ts           # DB connection lookup + token decrypt
│       ├── reauth.ts               # Re-auth flagging
│       ├── scheduler.ts            # Repeatable job registration
│       └── provider-config.ts      # PROVIDER_TOKEN_CONFIG constants
├── tests/
│   ├── content-sync.test.ts       # Content sync worker tests
│   ├── token-refresh.test.ts       # Token refresh worker tests
│   └── utils/
│       ├── connection.test.ts      # Connection utility tests
│       ├── reauth.test.ts          # Re-auth utility tests
│       └── scheduler.test.ts       # Scheduler utility tests
└── package.json

apps/queue-service/
├── src/
│   ├── index.ts                    # App entry — connection, queues, workers, schedulers
│   ├── queues.ts                   # Queue definitions (content-sync, token-refresh)
│   ├── workers/
│   │   ├── content-sync.ts         # Content sync worker logic
│   │   └── token-refresh.ts        # Token refresh worker logic
│   └── utils/
│       ├── connection.ts           # DB connection lookup + token decrypt
│       ├── reauth.ts               # Re-auth flagging
│       ├── scheduler.ts            # Repeatable job registration
│       ├── provider-config.ts      # PROVIDER_TOKEN_CONFIG constants
│       └── logger.ts               # Structured logging

packages/shared-be/src/providers/instagram/
├── client.ts                       # Existing — InstagramContentProvider class
├── content.ts                      # NEW — fetchInstagramContent() orchestration
├── content.test.ts                 # NEW — tests
├── token-refresh.ts                # NEW — refreshInstagramToken() orchestration
├── token-refresh.test.ts           # NEW — tests
├── types.ts                        # Existing — Zod schemas
└── index.ts                        # Existing — barrel export (update)
```

## CLI App

Standalone `apps/cli` app for manual operations, debugging, and admin tasks. Not limited to queue operations — can cover DB inspection, user management, bulk ops, etc.

### Commands (queue-related, implemented now)

```bash
# Sync content for an artist+provider — runs fetch + upsert inline, prints results
bun run --filter @indieport/cli sync-content --artist-id=<uuid> --provider=instagram

# Refresh token for a connection — runs refresh + re-encrypt inline, prints new expiry
bun run --filter @indieport/cli refresh-token --connection-id=<uuid>

# List all social connections for an artist (debug helper)
bun run --filter @indieport/cli list-connections --artist-id=<uuid>
```

### Future commands (not implemented now, examples of scope)

```bash
bun run --filter @indieport/cli list-artists          # List all artists
bun run --filter @indieport/cli show-artist --id=<uuid> # Artist details + connections + content count
bun run --filter @indieport/cli seed-themes            # Seed default themes
```

### Why a separate app

- Broader scope than queue ops — admin, debugging, bulk operations, seeding
- Own `package.json` with only the deps it needs (shared-be, database, no BullMQ/Redis)
- Independent lifecycle — run without Redis, without queue-service running
- CLI imports shared packages, calls provider functions directly — same code path as workers, minus the queue wrapper

### CLI vs Worker difference

| | CLI | Worker |
|---|---|---|
| Trigger | Manual command | BullMQ job |
| Retry | None — fail fast, you see the error | 3 attempts with backoff |
| Logging | Pretty-printed to stdout | Structured JSON |
| Redis required | No | Yes |
| Use case | Dev, debugging, one-off manual runs | Production automated processing |

### Implementation

CLI imports shared packages directly, resolves services via NovaDI container, calls provider functions without BullMQ:

```typescript
// apps/cli/src/commands/sync-content.ts
import { fetchInstagramContent } from '@indieport/shared-be/providers/instagram';
import { getConnection } from '@indieport/queue-service/utils/connection';

export async function syncContent(artistId: string, provider: string) {
  const connection = await getConnection(artistId, provider);
  const content = await fetchInstagramContent(connection.accessToken);
  // upsert to DB...
  console.log(`Synced ${content.length} items for ${provider}`);
}
```

Workers resolve dependencies via NovaDI and wrap shared functions with BullMQ retry/dedup/rate-limit:

```typescript
// apps/queue-service/src/workers/content-sync.ts
import { fetchInstagramContent } from '@indieport/shared-be/providers/instagram';
import { getConnection } from '../utils/connection';

export const contentSyncWorker = new Worker('content-sync', async (job) => {
  const { artistId, provider } = job.data;
  const connection = await getConnection(artistId, provider);
  const content = await fetchInstagramContent(connection.accessToken);
  // upsert to DB...
}, { connection: redisConnection, limiter: { ... } });
```

Core logic lives in `shared-be` provider functions. Workers and CLI both call those functions. Workers add retry/dedup/rate-limit wrappers. CLI adds pretty-print output.

## Implementation Order

### Phase 1: Shared Utilities (no workers yet)

1. **`packages/shared-be/src/logger.ts`** — Pino logger setup (shared across all BE services)
2. **`apps/queue-service/src/utils/provider-config.ts`** — `PROVIDER_TOKEN_CONFIG` constants
3. **`apps/queue-service/src/utils/connection.ts`** — DB lookup + token decrypt
4. **`apps/queue-service/src/utils/reauth.ts`** — re-auth flagging
5. **`apps/queue-service/src/utils/scheduler.ts`** — repeatable job registration
6. **Schema update** — add `needs_reauth` column to `social_connections` in `packages/database/src/schema.ts`, generate migration with Drizzle

### Phase 2: Token Refresh (do this first — content-sync depends on it)

1. **`packages/shared-be/src/providers/instagram/token-refresh.ts`** — `refreshInstagramToken()` function
2. **`packages/shared-be/src/providers/instagram/token-refresh.test.ts`** — unit tests
3. **`apps/queue-service/src/workers/token-refresh.ts`** — BullMQ worker
4. **`apps/queue-service/tests/token-refresh.test.ts`** — worker tests
5. **`packages/shared-be/src/providers/instagram/index.ts`** — export new function

### Phase 3: Content Sync

1. **`packages/shared-be/src/providers/instagram/content.ts`** — `fetchInstagramContent()` function
2. **`packages/shared-be/src/providers/instagram/content.test.ts`** — unit tests
3. **`apps/queue-service/src/workers/content-sync.ts`** — BullMQ worker
4. **`apps/queue-service/tests/content-sync.test.ts`** — worker tests
5. **`packages/shared-be/src/providers/instagram/index.ts`** — export new function

### Phase 4: Wiring & CLI

1. **`apps/cli/src/index.ts`** — CLI entry point with argument parsing
2. **`apps/cli/src/commands/sync-content.ts`** — CLI sync command
3. **`apps/cli/src/commands/refresh-token.ts`** — CLI refresh command
4. **`apps/cli/src/commands/list-connections.ts`** — CLI debug helper
5. **`apps/queue-service/src/queues.ts`** — queue definitions with job defaults
6. **`apps/queue-service/src/index.ts`** — register workers, schedulers, graceful shutdown
7. **`apps/api/src/index.ts`** — enqueue initial sync + schedule refresh on OAuth connection creation

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Queue library | BullMQ | Already installed, Redis already justified for caching, rich features |
| Job dedup | `{artistId}:{provider}` jobId | Prevents duplicate syncs stacking up for same artist+provider |
| Rate limiting | BullMQ `limiter` on worker | 200 jobs/hr per worker — matches IG rate limit |
| Retry strategy | 3 attempts, exponential backoff (5s base, 5min max) | Covers transient failures without overloading |
| Token refresh timing | Provider-specific buffer before expiry | Different providers have different token TTLs. Buffer is configurable per provider |
| Re-auth flag | `needs_reauth` column on `social_connections` | Simple boolean, easy to query, dashboard can show reconnect prompt |
| Re-auth flag | `needs_reauth` column on `social_connections` | Simple boolean, easy to query, dashboard can show reconnect prompt |
| Encryption key | Shared between API and queue-service | Workers must decrypt tokens stored by API. Same `ENCRYPTION_KEY` env var |
| Logging | Pino (in `shared-be`) | All BE services need logging. Pino is fast, structured, and has pretty-print transport for CLI dev |
| CLI tool | `apps/queue-service/src/cli/` | Reuses same code as workers. Manual testing before automated wiring. Not a separate app |
| DI | NovaDI (composition root) | All BE apps use NovaDI. No decorators. Services stay pure. Wiring at entry point |
| Provider token config | `PROVIDER_TOKEN_CONFIG` constant map | Each provider has different TTL + refresh buffer. Single source of truth |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Redis unavailable | BullMQ built-in reconnection. Workers pause, resume when Redis back up. No data loss — jobs persisted in Redis |
| Worker crash mid-sync | BullMQ requeues job. Upsert is idempotent on `(artist_id, provider, external_id)` |
| IG API returns stale data | `synced_at` timestamp tracks freshness. Dashboard can show last sync time |
| Token expired mid-sync | Worker checks expiry, enqueues token-refresh, retries sync after |
| Double enqueue on OAuth callback + scheduler | Job ID dedup prevents duplicates |
| Race condition: sync running while token-refresh updates same row | Token-refresh updates `social_connections`. Sync reads token at job start. Unlikely to collide — 30min sync interval, token refresh is one-time |