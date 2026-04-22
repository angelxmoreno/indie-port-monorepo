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

## Encryption
- OAuth tokens: at-rest encryption required (e.g., pgcrypto `pgp_sym_encrypt` or application-layer AES-GCM) before storing in DB
- HTTPS in transit + RLS for access control; encryption is the storage-layer protection