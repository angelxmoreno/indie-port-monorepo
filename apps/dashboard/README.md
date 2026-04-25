# @indieport/dashboard

React dashboard for IndiePort. Phone OTP authentication, protected routes, and API integration via Vite proxy.

## Setup

1. Copy the example env file:

```bash
cp .env.example .env
```

2. Fill in the values in `.env`:

| Variable | Description | Where to find |
|----------|-------------|---------------|
| `VITE_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | Supabase Dashboard → Project Settings → API → anon public |
| `VITE_API_URL` | API base URL | Use `http://localhost:3001/api` for local dev |

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun run dev` | Start Vite dev server (port 3002) |
| `bun run build` | Type-check and build for production |
| `bun run preview` | Preview production build |
| `bun run type:check` | TypeScript type checking |
| `bun run lint` | Biome lint check |
| `bun run lint:fix` | Biome lint + auto-fix |
| `bun test` | Run tests |

## Architecture

- **Auth**: Supabase phone OTP (`signInWithOtp` / `verifyOtp`). Zustand store in `@indieport/shared-fe` manages auth state (no provider wrapping needed).
- **Routing**: React Router v7 (imports from `react-router`, not `react-router-dom`). `/login` is public, `/` requires authentication.
- **API proxy**: Vite dev server proxies `/api/*` to `http://localhost:3001` — no CORS setup needed in development.
- **API client**: `@indieport/shared-fe` provides a typed fetch wrapper that auto-attaches the Bearer token from the Zustand auth store.

## Auth Flow

1. User enters phone number → Supabase sends SMS OTP
2. User enters 6-digit code → Supabase verifies, returns JWT
3. Zustand auth store holds session + JWT in memory
4. API calls go through `apiClient` with `Authorization: Bearer <jwt>`
5. API middleware validates JWT, lazy-creates artist row on first request

## Prerequisites

- API server running on port 3001 (`cd apps/api && bun run dev`)
- Supabase project with SMS provider configured