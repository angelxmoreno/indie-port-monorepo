# Content Ingestion & Rendering Flow

## Ingestion (Write Path)

Content is pulled from providers via the queue-service and saved to the database.

```
Provider API → Queue Worker → Normalize → Categorize → Save to `content` table
```

### Steps

1. Artist connects a provider (OAuth flow)
2. API enqueues `content.sync` job with `{ artistId, provider }`
3. Queue worker fetches content from provider API
4. Each content item is normalized into a common shape:
   - `category`: determined by provider + content type (e.g., IG photo → `image`, IG reel → `video`)
   - `externalId`: the provider's content ID (used for dedup)
   - `url`, `thumbnailUrl`, `title`, `description`, `metadata`
5. Worker upserts into `content` table (on conflict of `artist_id + provider + external_id`, update)
6. Worker updates `synced_at` timestamp

### Token Refresh

- Repeatable BullMQ job per `social_connection`
- Runs before token expiration (checked via `token_expires_at`)
- On failure, job retries with backoff. After N failures, marks connection as needing re-auth.

## Rendering (Read Path)

Portfolios read exclusively from the database.

```
Visitor → Portfolio (subdomain) → DB query by artist_id + category → Render sections
```

### Dynamic Sections

Portfolio sections are determined by what content exists in the database for that artist:

| Content in DB | Section shown |
|---------------|---------------|
| Any `image` category content | Images |
| Any `video` category content | Videos |
| Any `music` category content | Music |

If an artist has no music content, the "Music" nav item does not appear.

### Provider → Category Mapping

| Provider | Categories |
|----------|-----------|
| Instagram | image, video |
| TikTok | video |
| YouTube | video |
| Spotify | music |
| SoundCloud | music |