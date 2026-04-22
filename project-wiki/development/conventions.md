# Development Conventions

## Zod-First Development

All data shapes are defined as Zod schemas first. TypeScript types are derived from Zod schemas, never the other way around.

### Pattern

```ts
// Define schema
export const artistSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  subdomain: z.string().min(1).max(63),
  customDomain: z.string().nullable(),
  themeId: z.uuid(),
  plan: z.enum(["free", "pro"]),
  createdAt: z.date(),
  modifiedAt: z.date(),
  deletedAt: z.date().nullable(),
});

// Derive type
export type Artist = z.infer<typeof artistSchema>;
```

### Where schemas live

- `packages/shared-types` — Core domain schemas and types shared across all apps
- `packages/database` — Drizzle schemas (these are the DB representation; Zod schemas in shared-types are the domain representation)
- API request/response schemas defined near their usage in `apps/api`

### Schema vs Drizzle

- Drizzle schemas define the database shape (columns, constraints, indexes)
- Zod schemas define the domain/business shape (validation rules, transformations)
- The queue-service and API map between the two

## Database Column Conventions

- Every table has `created_at`, `modified_at`, `deleted_at`
- `deleted_at` is used for soft deletes
- Queries default to filtering `deleted_at IS NULL`

## Naming Conventions

- Files: kebab-case (e.g., `social-connection.schema.ts`)
- Zod schemas: camelCase with `Schema` suffix (e.g., `artistSchema`)
- Types: PascalCase, derived via `z.infer` (e.g., `Artist`)
- Drizzle table objects: plural camelCase (e.g., `socialConnections`)

## Protected Over Private

- Use `protected` visibility over `private` in classes