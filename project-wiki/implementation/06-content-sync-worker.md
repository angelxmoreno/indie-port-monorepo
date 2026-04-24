# 06 — Queue Service: Content Sync Worker

## Goal

Implement the `content.sync` BullMQ worker that fetches content from Instagram, normalizes it, and upserts it into the `content` table.

## Context

The queue service has stub workers that only `console.log` job data. The content sync worker must: receive a job with `{ artistId, provider }`, look up the artist's decrypted social connection token, call the Instagram API to fetch media, normalize each item into the common content shape, and upsert into the database using the `artist_id + provider + external_id` unique constraint.

## Files to Create

- `packages/shared-be/src/providers/instagram/content.ts` — `fetchInstagramContent(accessToken, userId)` function that calls the Meta Graph API `/me/media` endpoint and returns normalized content items
- `packages/shared-be/src/providers/instagram/content.test.ts` — tests for content fetching and normalization
- `apps/queue-service/src/workers/content-sync.ts` — BullMQ worker that processes `content.sync` jobs: decrypts token, fetches content, normalizes, upserts into DB, updates `synced_at`
- `apps/queue-service/src/workers/content-sync.test.ts` — integration tests for the worker

## Files to Modify

- `apps/queue-service/src/index.ts` — replace stub worker with real `content-sync` worker
- `packages/shared-be/src/providers/instagram/index.ts` — export content fetcher
- `packages/shared-be/src/index.ts` — re-export content fetcher

## Files to Reference

- `project-wiki/architecture/content-flow.md` — ingestion steps, normalization rules, provider→category mapping
- `packages/database/src/schema.ts` — `content` table definition, unique constraint
- `packages/shared-types/src/index.ts` — `contentSchema`, `providerSchema`, `PROVIDER_CONTENT_TYPES`

## Acceptance Criteria

- Worker processes `content.sync` job for Instagram provider
- Fetches media from Instagram Graph API using decrypted access token
- Normalizes Instagram items into the common content shape (photos → `image`, reels → `video`)
- Upserts into `content` table using `artist_id + provider + external_id` unique constraint
- Updates `synced_at` timestamp on successful sync
- Handles API errors, rate limits, and token expiration gracefully
- Logs sync results (items synced, errors encountered)
- `bun run validate` passes with zero errors

## Commit Message

```
feat(queue-service): implemented Instagram content sync worker

- Added Instagram content fetcher to shared-be provider client
- Implemented content-sync BullMQ worker with token decryption
- Normalized Instagram media into common content shape
- Upserted content using artist+provider+externalId unique constraint
```