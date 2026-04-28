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
| `ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `INSTAGRAM_CLIENT_ID` | Instagram App client ID | Meta for Developers → App → Basic Display |
| `INSTAGRAM_CLIENT_SECRET` | Instagram App client secret | Meta for Developers → App → Basic Display |
| `INSTAGRAM_REDIRECT_URI` | OAuth callback URL (must match Meta app settings) | `https://your-api.com/api/oauth/instagram/callback` |
| `DASHBOARD_URL` | Dashboard origin for OAuth redirects | `http://localhost:3002` |

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

## Instagram OAuth

### `GET /api/oauth/instagram`

Requires authentication. Returns `{ authUrl }` — the Instagram Basic Display OAuth consent URL. The `state` parameter is encrypted with AES-256-GCM and includes the artist ID and a 10-minute expiry.

### `GET /api/oauth/instagram/callback`

Public endpoint (must be reachable from Instagram). Handles the OAuth callback:

1. Validates the encrypted `state` parameter (10-minute expiry)
2. Exchanges the authorization code for a long-lived Instagram token
3. Encrypts the access token with AES-256-GCM
4. Upserts the token into `social_connections`
5. Redirects to the dashboard with `?connected=true` or `?connected=false&error=...`

**Note:** The enqueueing of `content.sync` is pending (Ticket E).