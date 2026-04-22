# Monorepo Structure

## Layout

```
IndiePort/
├── apps/
│   ├── api/              # Hono API server
│   ├── portfolios/       # Astro multi-tenant SSR
│   ├── dashboard/        # Vite + React
│   ├── marketing-site/  # Astro static
│   └── queue-service/    # BullMQ workers
├── packages/
│   ├── database/         # Drizzle ORM, schema, migrations
│   ├── shared-types/     # Shared TypeScript types/interfaces (Zod-First)
│   ├── shared-fe/        # Shared React components, hooks, utils
│   └── shared-be/        # Shared backend utilities (auth helpers, provider clients)
└── project-wiki/        # Project documentation
```

## Apps

| App | Framework | Port | Purpose |
|-----|-----------|------|---------|
| api | Hono | 3001 | REST API, OAuth callbacks, auth middleware |
| portfolios | Astro (SSR) | 3003 | Multi-tenant portfolio rendering (subdomain-based) |
| dashboard | Vite + React | 3002 | Artist management interface |
| marketing-site | Astro (static) | 3004 | Public landing page for IndiePort |
| queue-service | BullMQ | — | Background workers for content sync and token refresh |

## Packages

| Package | Purpose |
|---------|---------|
| database | Drizzle schema, migrations, connection helper. Used by api, queue-service, portfolios |
| shared-types | Zod schemas and derived TypeScript types. Used by all apps and packages |
| shared-be | Backend utilities: provider OAuth clients, auth helpers. Used by api and queue-service |
| shared-fe | Frontend utilities: shared React components, hooks. Used by dashboard, portfolios, marketing-site |