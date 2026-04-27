# Database Schema

## Conventions

See [conventions.md](conventions.md) for column standards, soft-delete rules, naming, and Zod-First conventions.

## Tables

### `themes`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, defaultRandom() |
| name | varchar(100) | NOT NULL |
| config | jsonb | NOT NULL |
| created_at | timestamp | NOT NULL, defaultNow() |
| modified_at | timestamp | NOT NULL, defaultNow() |
| deleted_at | timestamp | nullable |

### `artists`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, defaultRandom() |
| user_id | uuid | NOT NULL (references Supabase auth) |
| subdomain | varchar(63) | NOT NULL, UNIQUE (where deleted_at IS NULL) |
| custom_domain | varchar(253) | nullable, UNIQUE (where deleted_at IS NULL) |
| theme_id | uuid | NOT NULL, FK → themes.id |
| plan | enum(free, pro) | NOT NULL, default 'free' |
| created_at | timestamp | NOT NULL, defaultNow() |
| modified_at | timestamp | NOT NULL, defaultNow() |
| deleted_at | timestamp | nullable |

### `social_connections`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, defaultRandom() |
| artist_id | uuid | NOT NULL, FK → artists.id, ON DELETE CASCADE |
| provider | enum(instagram, tiktok, youtube, spotify, soundcloud) | NOT NULL |
| access_token | text | NOT NULL (encrypted at rest with AES-256-GCM) |
| refresh_token | text | nullable (encrypted at rest with AES-256-GCM) |
| token_expires_at | timestamp | nullable |
| scopes | text[] | NOT NULL, default [] |
| created_at | timestamp | NOT NULL, defaultNow() |
| modified_at | timestamp | NOT NULL, defaultNow() |
| deleted_at | timestamp | nullable |

**Unique index:** `(artist_id, provider)` **where deleted_at IS NULL**

### `content`

| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, defaultRandom() |
| artist_id | uuid | NOT NULL, FK → artists.id, ON DELETE CASCADE |
| provider | enum(instagram, tiktok, youtube, spotify, soundcloud) | NOT NULL |
| category | enum(image, video, music) | NOT NULL |
| external_id | varchar(255) | NOT NULL |
| url | text | NOT NULL |
| thumbnail_url | text | nullable |
| title | text | nullable |
| description | text | nullable |
| metadata | jsonb | nullable |
| published_at | timestamp | nullable |
| synced_at | timestamp | NOT NULL, defaultNow() |
| created_at | timestamp | NOT NULL, defaultNow() |
| modified_at | timestamp | NOT NULL, defaultNow() |
| deleted_at | timestamp | nullable |

**Unique index:** `(artist_id, provider, external_id)` **where deleted_at IS NULL**

## Enums

### `provider`
- `instagram`
- `tiktok`
- `youtube`
- `spotify`
- `soundcloud`

### `content_category`
- `image`
- `video`
- `music`

### `plan`
- `free`
- `pro`