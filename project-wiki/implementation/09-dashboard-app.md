# 09 — Dashboard App

## Goal

Build the artist dashboard where artists manage their profile, connect social accounts, view their content, and configure their portfolio.

## Context

The dashboard is a Vite + React 19 SPA that communicates with the API. It currently has a single placeholder `<h1>`. The dashboard needs routing, API integration, Supabase auth (login/signup/logout), and pages for each management area.

## Files to Create

- `apps/dashboard/src/pages/Dashboard.tsx` — main dashboard home (overview of artist stats)
- `apps/dashboard/src/pages/Connections.tsx` — manage social connections (connect/disconnect providers)
- `apps/dashboard/src/pages/Content.tsx` — view synced content, filter by category/provider
- `apps/dashboard/src/pages/Settings.tsx` — profile settings (subdomain, custom domain, theme selection)
- `apps/dashboard/src/pages/Login.tsx` — Supabase auth login/signup page
- `apps/dashboard/src/components/Layout.tsx` — dashboard layout shell (sidebar nav, header)
- `apps/dashboard/src/components/ProtectedRoute.tsx` — auth guard component that redirects to login
- `apps/dashboard/src/hooks/useAuth.ts` — hook for Supabase auth state and user info
- `apps/dashboard/src/hooks/useApi.ts` — hook for authenticated API calls (attaches JWT)
- `apps/dashboard/src/lib/api.ts` — API client with base URL config and error handling
- `apps/dashboard/src/lib/supabase.ts` — Supabase client initialization for frontend

## Files to Modify

- `apps/dashboard/src/App.tsx` — replace placeholder with React Router setup and auth provider wrapper
- `apps/dashboard/src/main.tsx` — add auth provider wrapper around app
- `apps/dashboard/package.json` — add `react-router`, `@supabase/supabase-js`, `@indieport/shared-fe`, `@indieport/shared-types`

## Files to Reference

- `project-wiki/decisions/tech-stack.md` — Vite + React 19, Supabase Auth
- `project-wiki/decisions/payments.md` — free vs pro tier features
- `project-wiki/architecture/overview.md` — dashboard in system diagram
- `packages/shared-types/src/index.ts` — domain types for API responses

## Acceptance Criteria

- Login page authenticates via Supabase, redirects to dashboard
- Unauthenticated users are redirected to login
- Dashboard home shows artist overview
- Connections page lists connected providers, with "Connect Instagram" button
- Content page displays synced content with category filters
- Settings page allows subdomain and theme changes
- All API calls include the Supabase JWT in Authorization header
- `bun run validate` passes with zero errors

## Commit Message

```
feat(dashboard): implemented artist dashboard with auth and routing

- Added Supabase auth login/signup/logout flow
- Created dashboard layout with sidebar navigation
- Built connections, content, and settings pages
- Added authenticated API client hook
- Protected all dashboard routes behind auth guard
```