# IndiePort Implementation Todos

Ordered by dependency. Each item links to its planning doc.

## Phase 1: Foundation

- [ ] [01 — Database Migrations & Query Helpers](implementation/01-db-migrations-and-helpers.md)
- [ ] [02 — Supabase Auth Integration](implementation/02-supabase-auth.md)

## Phase 2: Auth & OAuth

- [x] [03 — OAuth Token Encryption](implementation/03-oauth-token-encryption.md)
- [x] [04 — Instagram OAuth Provider Client](implementation/04-instagram-oauth-client.md)

## Phase 3: CLI App & Shared BE Utilities

CLI before queue services — validate provider logic manually before automating.

- [ ] **CLI App (`apps/cli`)**
  - [ ] `apps/cli/src/index.ts` — CLI entry point, argument parsing
  - [ ] `apps/cli/src/commands/sync-content.ts` — trigger content sync for an artist+provider
  - [ ] `apps/cli/src/commands/refresh-token.ts` — trigger token refresh for a connection
  - [ ] `apps/cli/src/commands/list-connections.ts` — debug: list connections for an artist

- [ ] **Shared BE Utilities**
  - [ ] `shared-be/src/logger.ts` — Pino logger setup (shared across all BE services)
  - [ ] `shared-be/src/providers/provider-config.ts` — PROVIDER_TOKEN_CONFIG constants
  - [ ] `queue-service/src/utils/connection.ts` — DB lookup + token decrypt
  - [ ] `queue-service/src/utils/reauth.ts` — re-auth flagging
  - [ ] `queue-service/src/utils/scheduler.ts` — repeatable job registration
  - [ ] Schema update — `needs_reauth` column on `social_connections`

## Phase 4: API CRUD & Queue Infrastructure

- [ ] [05 — API Auth Middleware & CRUD Routes](implementation/05-api-crud-routes.md)

Follow the phased order from [queue-infrastructure.md](implementation/queue-infrastructure.md):

- [ ] **Token Refresh** (before content-sync — sync depends on it)
  - [ ] `shared-be/providers/instagram/token-refresh.ts`
  - [ ] `shared-be/providers/instagram/token-refresh.test.ts`
  - [ ] `queue-service/src/workers/token-refresh.ts`
  - [ ] `queue-service/tests/token-refresh.test.ts`
  - [ ] `shared-be/providers/instagram/index.ts` — export new function

- [ ] **Content Sync**
  - [ ] `shared-be/providers/instagram/content.ts`
  - [ ] `shared-be/providers/instagram/content.test.ts`
  - [ ] `queue-service/src/workers/content-sync.ts`
  - [ ] `queue-service/tests/content-sync.test.ts`
  - [ ] `shared-be/providers/instagram/index.ts` — export new function

- [ ] **Queue Wiring**
  - [ ] `queue-service/src/queues.ts` — queue definitions
  - [ ] `queue-service/src/index.ts` — register workers, schedulers, graceful shutdown
  - [ ] `apps/api/src/index.ts` — enqueue initial sync + schedule refresh on OAuth callback

## Phase 5: Frontend Apps

- [ ] [08 — Portfolio SSR App](implementation/08-portfolio-ssr.md)
- [ ] [09 — Dashboard App](implementation/09-dashboard-app.md)
- [ ] [10 — Marketing Site](implementation/10-marketing-site.md)

## Phase 6: Shared & Infra

- [ ] [11 — Shared Packages](implementation/11-shared-packages.md)
- [ ] [12 — Staging Infrastructure & Deployment](implementation/12-staging-infra.md)

## Notes

- Tickets 03 & 04 are done (auth-implementation.md Tickets C & D)
- Queue infrastructure replaces the original tickets 06 & 07 in `implementation/`
- CLI app ships before queue services — validate provider logic manually first
- Logger is Pino, utility lives in `shared-be/src/logger.ts` (all BE services use it)
- Token refresh must ship before content sync — sync worker enqueues refresh jobs for expired tokens
- CLI app (`apps/cli`) reuses shared packages, no Redis dependency
- NovaDI for DI in all BE apps (api, queue-service, cli). Composition root pattern — no decorators on service classes
- Logger is Pino, utility lives in `shared-be/src/logger.ts` (all BE services use it)