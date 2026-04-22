# Database Conventions

## Column Standards

- `id` — UUID primary key, auto-generated via `defaultRandom()`
- `created_at` — Timestamp of record creation, NOT NULL, `defaultNow()`
- `modified_at` — Timestamp of last modification, NOT NULL, `defaultNow()`
- `deleted_at` — Soft delete timestamp, nullable. When set, record is considered deleted

## Soft Deletes

- Never hard-delete user-facing data (artists, content, social connections)
- Use soft deletes by setting `deleted_at` to the current timestamp
- Queries must filter `WHERE deleted_at IS NULL` unless intentionally accessing deleted records
- Drizzle queries should use a shared `notDeleted()` filter helper

## Foreign Keys

- Always use `ON DELETE CASCADE` for dependent records (e.g., content → artist)
- Foreign keys reference the `id` column of the target table

## Naming

- Table names: plural, snake_case (e.g., `social_connections`)
- Column names: snake_case (e.g., `token_expires_at`)
- Enum names: snake_case (e.g., `content_category`)
- Enum values: lowercase, no underscores (e.g., `soundcloud`)

## Zod-First

- Database schema shapes should have corresponding Zod schemas in `packages/shared-types`
- Insert/select types are derived from Drizzle's built-in inference
- API validation uses Zod schemas from `shared-types`