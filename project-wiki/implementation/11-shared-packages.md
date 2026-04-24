# 11 — Shared Packages (shared-be, shared-fe)

## Goal

Flesh out the shared backend (`shared-be`) and shared frontend (`shared-fe`) packages with the utilities, constants, and components that multiple apps depend on.

## Context

Both `shared-be` and `shared-fe` currently contain only `export {}`. The implementation tickets above reference these packages for crypto, auth, provider clients, and UI components. This ticket establishes the foundational utilities that don't belong to a specific ticket but are needed across multiple apps.

## Files to Create — `shared-be`

- `packages/shared-be/src/constants.ts` — shared constants (queue names `content-sync`, `token-refresh`; Redis config defaults; provider enum values)
- `packages/shared-be/src/errors.ts` — typed error classes (`AppError`, `AuthError`, `ProviderError`, `NotFoundError`) with HTTP status codes
- `packages/shared-be/src/env.ts` — environment variable validation using Zod (required vars: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ENCRYPTION_KEY`, `REDIS_URL`)

## Files to Create — `shared-fe`

- `packages/shared-fe/src/components/Button.tsx` — base button component with variants (primary, secondary, danger)
- `packages/shared-fe/src/components/Input.tsx` — text input component with label, error state
- `packages/shared-fe/src/components/Card.tsx` — card container component
- `packages/shared-fe/src/components/index.ts` — barrel export
- `packages/shared-fe/src/hooks/useMediaQuery.ts` — responsive breakpoint hook
- `packages/shared-fe/src/utils/cn.ts` — classname utility (thin wrapper around `clsx` if added, or simple conditional join)

## Files to Modify

- `packages/shared-be/src/index.ts` — re-export constants, errors, env
- `packages/shared-be/package.json` — add `zod` dependency (for env validation)
- `packages/shared-fe/src/index.ts` — re-export components, hooks, utils
- `packages/shared-fe/package.json` — add `react` peer dependency if not present

## Files to Reference

- `project-wiki/development/conventions.md` — naming conventions, Zod-First approach
- `project-wiki/architecture/monorepo-structure.md` — shared packages purpose

## Acceptance Criteria

- `shared-be` exports constants, error classes, and env validation
- `shared-fe` exports basic UI components and utility hooks
- All Zod schemas follow Zod-First conventions (types derived from schemas)
- No `any` types — proper typing throughout
- `bun run validate` passes with zero errors for both packages

## Commit Message

```
feat(shared): added foundational utilities to shared-be and shared-fe

- Added constants, error classes, and env validation to shared-be
- Added Button, Input, Card components and utility hooks to shared-fe
- Re-exported all new modules from package entry points
```