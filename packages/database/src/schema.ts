import { jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

export const providerEnum = pgEnum('provider', ['instagram', 'tiktok', 'youtube', 'spotify', 'soundcloud']);

export const contentCategoryEnum = pgEnum('content_category', ['image', 'video', 'music']);

export const planEnum = pgEnum('plan', ['free', 'pro']);

export const themes = pgTable('themes', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    config: jsonb('config').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    modifiedAt: timestamp('modified_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
});

export const artists = pgTable('artists', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    subdomain: varchar('subdomain', { length: 63 }).notNull(),
    customDomain: varchar('custom_domain', { length: 253 }),
    themeId: uuid('theme_id')
        .notNull()
        .references(() => themes.id),
    plan: planEnum('plan').notNull().default('free'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    modifiedAt: timestamp('modified_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
});

export const socialConnections = pgTable(
    'social_connections',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        artistId: uuid('artist_id')
            .notNull()
            .references(() => artists.id, { onDelete: 'cascade' }),
        provider: providerEnum('provider').notNull(),
        accessToken: text('access_token').notNull(),
        refreshToken: text('refresh_token'),
        tokenExpiresAt: timestamp('token_expires_at'),
        scopes: text('scopes').array().notNull().default([]),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        modifiedAt: timestamp('modified_at').notNull().defaultNow(),
        deletedAt: timestamp('deleted_at'),
    },
    (table) => [uniqueIndex('social_connections_artist_provider_idx').on(table.artistId, table.provider)]
);

export const content = pgTable(
    'content',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        artistId: uuid('artist_id')
            .notNull()
            .references(() => artists.id, { onDelete: 'cascade' }),
        provider: providerEnum('provider').notNull(),
        category: contentCategoryEnum('category').notNull(),
        externalId: varchar('external_id', { length: 255 }).notNull(),
        url: text('url').notNull(),
        thumbnailUrl: text('thumbnail_url'),
        title: text('title'),
        description: text('description'),
        metadata: jsonb('metadata'),
        publishedAt: timestamp('published_at'),
        syncedAt: timestamp('synced_at').notNull().defaultNow(),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        modifiedAt: timestamp('modified_at').notNull().defaultNow(),
        deletedAt: timestamp('deleted_at'),
    },
    (table) => [
        uniqueIndex('content_artist_provider_external_idx').on(table.artistId, table.provider, table.externalId),
    ]
);
