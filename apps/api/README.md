# @indieport/api

Hono API server for IndiePort. Handles authenticated routes, OAuth callbacks, and artist management.

## Setup

1. Copy the example env file:

```bash
cp .env.example .env
```

2. Fill in the values in `.env`:

| Variable | Description | Where to find |
|----------|-------------|---------------|
| `PORT` | Server port (default 3001) | — |
| `SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key | Supabase Dashboard → Project Settings → API → anon public |
| `DATABASE_URL` | PostgreSQL connection string | Supabase Dashboard → Project Settings → Database → Connection string (use the pooler URL, port 6543) |

**Note:** If your database password contains special characters (`&`, `?`, `+`, `*`), URL-encode them in the connection string.

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start dev server with watch mode |
| `bun run build` | Build for production |
| `bun run start` | Run production build |
| `bun run type:check` | TypeScript type checking |
| `bun run lint` | Biome lint check |
| `bun run lint:fix` | Biome lint + auto-fix |
| `bun test` | Run tests |

## Auth

All routes under `/api/*` require a valid Supabase JWT in the `Authorization: Bearer <token>` header. The `/health` endpoint is public.

On first authenticated request, the middleware automatically creates an `artists` row for the user if one doesn't exist (lazy provisioning).