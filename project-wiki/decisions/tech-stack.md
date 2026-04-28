# Tech Stack Decisions

## Runtime & Package Manager
- **Bun** — runtime, package manager, test runner

## Monorepo
- **Turborepo** — task orchestration, caching, workspace management

## Frontend

| Concern | Choice |
|---------|--------|
| Portfolio rendering | Astro (SSR, subdomain-based multi-tenancy) |
| Marketing site | Astro (static) |
| Dashboard | Vite + React 19 |
| Shared UI | React components in `packages/shared-fe` |

## Backend

| Concern | Choice |
|---------|--------|
| API server | Hono |
| Queue service | BullMQ + Redis |
| ORM | Drizzle |
| Database | PostgreSQL (self-hosted Supabase) |
| Auth | Supabase Auth |
| Dependency injection | NovaDI |
| Logging | Pino |

## Validation
- **Zod** — Zod-First development: define schemas first, derive types from them

## Payments
- **LemonSqueezy** — Merchant of Record, handles global tax compliance, invoicing, chargebacks

## Provider APIs
| Priority | Provider | API |
|----------|----------|-----|
| 1st | Instagram | Meta Graph API |
| 2nd | TBD | TBD |

## Infrastructure

| Concern | Choice |
|---------|--------|
| Database | Self-hosted Supabase (PostgreSQL + Auth) |
| Queue | Redis (container alongside Supabase) |
| Staging | Home server via dokploy |
| Production | Hetzner VPS + dokploy |
| CDN/DDoS | Cloudflare (free tier, in front of VPS) |

## Dependency Injection

- **NovaDI** — decorator-free DI for TypeScript
- Composition root pattern: all DI configuration at app entry points, business classes stay pure
- Uses TypeScript transformer for autowiring (no decorators, no runtime reflection)
- Applied in: `api`, `queue-service`, `cli`
- Not applied in frontend apps (React has its own DI via context/props)

## Logging

- **Pino** — structured JSON logger
- Shared utility in `packages/shared-be/src/logger.ts`
- `createLogger(service)` returns a Pino child logger with `service` field
- All BE services use it (API, queue-service, CLI)

## Encryption
- OAuth tokens: at-rest encryption required (e.g., pgcrypto `pgp_sym_encrypt` or application-layer AES-GCM) before storing in DB
- HTTPS in transit + RLS for access control; encryption is the storage-layer protection