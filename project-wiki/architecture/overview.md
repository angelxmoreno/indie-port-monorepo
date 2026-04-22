# Architecture Overview

## Core Principle

**Decoupled ingestion and rendering.** All content is pulled from social media providers and saved to the database. Portfolios read from the database, never from providers. If a provider API fails, the portfolio still renders previously synced content.

## System Diagram

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Artist      │  │   Visitor    │  │   Public      │
│   Dashboard   │  │              │  │   Marketing   │
│  (Vite+React) │  │              │  │   (Astro)     │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                  │
       ▼                 ▼                  ▼
┌──────────────────────────────────────────────────┐
│                apps/api (Hono)                    │
│  - REST endpoints                                │
│  - Auth middleware (Supabase JWT)                │
│  - OAuth callback handlers                       │
└──────────┬───────────────────────────────────────┘
           │
     ┌─────┴──────┐
     ▼            ▼
┌─────────┐  ┌──────────┐
│  Redis   │  │ BullMQ   │
│          │  │ Workers  │
└─────────┘  └────┬─────┘
                   │
    ┌──────────────┼──────────────┐
    ▼              ▼              ▼
┌────────┐  ┌──────────┐  ┌───────────┐
│Content │  │  Token   │  │  Provider  │
│  Sync  │  │  Refresh  │  │  Clients  │
└───┬────┘  └────┬─────┘  └─────┬─────┘
    │            │              │
    └────────────┼──────────────┘
                 ▼
          ┌──────────────┐
          │  PostgreSQL   │
          │  (Supabase)   │
          └──────────────┘
                 │
                 ▼
          ┌──────────────┐
          │  Portfolios   │
          │  (Astro SSR)  │
          └──────────────┘
```

## OAuth + Content Flow

1. Artist clicks "Connect [Provider]" in dashboard
2. Dashboard redirects to `api.indieport.com/oauth/{provider}` → redirects to provider OAuth
3. Provider redirects to `api.indieport.com/oauth/{provider}/callback`
4. API exchanges code for tokens → saves to `social_connections`
5. API enqueues a `content.sync` job in BullMQ
6. Queue worker fetches content from provider → normalizes → saves to `content` table
7. Queue worker enqueues a `token.refresh` repeatable job for that connection
8. Portfolio reads from `content` table — zero dependency on provider availability