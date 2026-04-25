# @indieport/database

Drizzle ORM package for the IndiePort PostgreSQL database (Supabase).

## Setup

1. Copy the example env file:

```bash
cp .env.example .env
```

2. Replace `[YOUR-PASSWORD]` in `.env` with your Supabase database password:

```
DATABASE_URL="postgresql://postgres.xbtwcveaoutzfyowikvh:[YOUR-PASSWORD]@aws-1-us-west-2.pooler.supabase.com:6543/postgres"
```

Get the connection string from: Supabase Dashboard → Project Settings → Database → Connection string (use the **pooler** URL with port 6543).

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun run db:generate` | Generate migration SQL from schema changes (no DB connection needed) |
| `bun run db:push` | Push schema directly to DB (dev only, no migration files) |
| `bun run db:migrate` | Run pending migrations against DB |
| `bun run type:check` | TypeScript type checking |
| `bun run lint` | Biome lint check |
| `bun run lint:fix` | Biome lint + auto-fix |
| `bun test` | Run tests |

## Generating Migrations

After modifying `src/schema.ts`, generate a migration:

```bash
bun run db:generate
```

This creates a new SQL file in `drizzle/`. No database connection required — it reads the TypeScript schema and diffs against the previous snapshot.

## Applying Migrations

```bash
bun run db:migrate
```

Requires a running database with a valid `DATABASE_URL`.

## Package Exports

```typescript
import { db, themes, artists, socialConnections, content, notDeleted } from '@indieport/database';
```

- `db` — Drizzle query builder instance
- Table definitions — `themes`, `artists`, `socialConnections`, `content`
- `notDeleted(table)` — soft-delete filter helper for queries