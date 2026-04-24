# 08 — Portfolio SSR App

## Goal

Implement the multi-tenant Astro SSR portfolio app that renders artist portfolios based on subdomain, pulling content from the database.

## Context

The portfolios app currently has a single placeholder page that extracts the subdomain from the hostname. It needs to look up the artist by subdomain, render their portfolio with the correct theme, and display their content organized by category (images, videos, music). Per the architecture, portfolios read exclusively from the database — never from provider APIs.

## Files to Create

- `apps/portfolios/src/layouts/BaseLayout.astro` — base HTML layout with theme config (fonts, colors)
- `apps/portfolios/src/layouts/PortfolioLayout.astro` — portfolio-specific layout with nav, header, footer
- `apps/portfolios/src/pages/index.astro` — replace placeholder with real artist lookup, content query, and section rendering
- `apps/portfolios/src/pages/[...slug].astro` — catch-all route for category pages (`/images`, `/videos`, `/music`)
- `apps/portfolios/src/components/ContentGrid.astro` — reusable grid component for displaying content items
- `apps/portfolios/src/components/Nav.astro` — dynamic nav that only shows categories the artist has content for
- `apps/portfolios/src/lib/db.ts` — database connection helper for Astro server-side rendering

## Files to Modify

- `apps/portfolios/astro.config.mjs` — add SSR adapter (e.g., `@astrojs/node` or cloud adapter depending on deployment target)
- `apps/portfolios/package.json` — add `@indieport/database` dependency, SSR adapter dependency
- `apps/portfolios/tsconfig.json` — ensure `tests/` is excluded (already done)

## Files to Delete

- (none — placeholder `pages/index.astro` gets replaced, not deleted)

## Files to Reference

- `project-wiki/architecture/content-flow.md` — rendering path, dynamic sections, category visibility
- `project-wiki/decisions/tech-stack.md` — Astro SSR, subdomain-based multi-tenancy
- `project-wiki/decisions/payments.md` — free vs pro tier feature gates (custom domain, theme access)
- `packages/database/src/schema.ts` — `artists`, `content`, `themes` tables
- `packages/database/src/filters.ts` — `notDeleted()` helper

## Acceptance Criteria

- Visiting `artist-slug.indieport.com` loads the correct artist's portfolio
- Unknown subdomains return 404
- Content sections (Images, Videos, Music) only render if the artist has content in that category
- Nav items only appear for categories with content
- Theme configuration (colors, fonts) is applied from the `themes` table
- Free-tier artists see only basic themes; pro-tier artists see all themes
- 404 page for unknown subdomains
- `bun run validate` passes with zero errors

## Commit Message

```
feat(portfolios): implemented multi-tenant SSR portfolio rendering

- Added artist lookup by subdomain with 404 for unknown subdomains
- Rendered content sections based on available categories
- Applied theme configuration from database
- Added dynamic nav showing only populated categories
```