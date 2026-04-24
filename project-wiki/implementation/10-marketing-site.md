# 10 — Marketing Site

## Goal

Build the public-facing marketing site for IndiePort — the landing page that explains the product, shows pricing, and drives signups.

## Context

The marketing site is a static Astro site currently showing a placeholder `<h1>`. It needs proper pages (home, pricing, about), shared UI components from `shared-fe`, and SEO optimization. No auth or database access required — this is purely a static marketing site.

## Files to Create

- `apps/marketing-site/src/layouts/BaseLayout.astro` — HTML shell with meta tags, fonts, global styles
- `apps/marketing-site/src/pages/index.astro` — replace placeholder with hero, features, CTA sections
- `apps/marketing-site/src/pages/pricing.astro` — pricing page showing free vs pro tiers
- `apps/marketing-site/src/components/Header.astro` — nav with logo, links, CTA button
- `apps/marketing-site/src/components/Footer.astro` — footer with links, copyright
- `apps/marketing-site/src/components/Hero.astro` — hero section with headline, subtext, CTA
- `apps/marketing-site/src/components/FeatureCard.astro` — feature showcase card component
- `apps/marketing-site/src/components/PricingTable.astro` — pricing comparison table

## Files to Modify

- `apps/marketing-site/src/pages/index.astro` — replace placeholder content
- `apps/marketing-site/package.json` — add `@indieport/shared-fe` dependency if using shared components

## Files to Delete

- (none — placeholder page gets replaced)

## Files to Reference

- `project-wiki/decisions/tech-stack.md` — Astro static site
- `project-wiki/decisions/payments.md` — free vs pro tier features for pricing page
- `project-wiki/architecture/monorepo-structure.md` — shared-fe for components

## Acceptance Criteria

- Home page renders with hero, features, and CTA
- Pricing page shows free vs pro tier comparison
- Pages use BaseLayout with consistent header and footer
- Site builds successfully with `astro build` (static output)
- SEO meta tags present on all pages
- `bun run validate` passes with zero errors

## Commit Message

```
feat(marketing-site): implemented landing page, pricing, and shared layout

- Created BaseLayout with header, footer, and SEO meta tags
- Built hero section, feature cards, and pricing table
- Added pricing page showing free vs pro tier comparison
- Replaced placeholder with full marketing content
```