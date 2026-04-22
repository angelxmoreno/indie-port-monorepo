import { z } from 'zod';

export const providerSchema = z.enum(['instagram', 'tiktok', 'youtube', 'spotify', 'soundcloud']);

export const contentCategorySchema = z.enum(['image', 'video', 'music']);

export const planSchema = z.enum(['free', 'pro']);

export const themeConfigSchema = z.object({
    colors: z.object({
        primary: z.string(),
        secondary: z.string(),
        background: z.string(),
        text: z.string(),
    }),
    fonts: z.object({
        heading: z.string(),
        body: z.string(),
    }),
    layout: z.object({
        sections: z.array(z.string()),
    }),
});

export const themeSchema = z.object({
    id: z.uuid(),
    name: z.string().min(1).max(100),
    config: themeConfigSchema,
    createdAt: z.date(),
    modifiedAt: z.date(),
    deletedAt: z.date().nullable(),
});

export const artistSchema = z.object({
    id: z.uuid(),
    userId: z.uuid(),
    subdomain: z.string().min(1).max(63),
    customDomain: z.string().nullable(),
    themeId: z.uuid(),
    plan: planSchema,
    createdAt: z.date(),
    modifiedAt: z.date(),
    deletedAt: z.date().nullable(),
});

export const socialConnectionSchema = z.object({
    id: z.uuid(),
    artistId: z.uuid(),
    provider: providerSchema,
    accessToken: z.string(),
    refreshToken: z.string().nullable(),
    tokenExpiresAt: z.date().nullable(),
    scopes: z.array(z.string()),
    createdAt: z.date(),
    modifiedAt: z.date(),
    deletedAt: z.date().nullable(),
});

export const contentSchema = z.object({
    id: z.uuid(),
    artistId: z.uuid(),
    provider: providerSchema,
    category: contentCategorySchema,
    externalId: z.string().min(1).max(255),
    url: z.url(),
    thumbnailUrl: z.url().nullable(),
    title: z.string().nullable(),
    description: z.string().nullable(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
    publishedAt: z.date().nullable(),
    syncedAt: z.date(),
    createdAt: z.date(),
    modifiedAt: z.date(),
    deletedAt: z.date().nullable(),
});

export type Provider = z.infer<typeof providerSchema>;
export type ContentCategory = z.infer<typeof contentCategorySchema>;
export type Plan = z.infer<typeof planSchema>;
export type ThemeConfig = z.infer<typeof themeConfigSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type Artist = z.infer<typeof artistSchema>;
export type SocialConnection = z.infer<typeof socialConnectionSchema>;
export type Content = z.infer<typeof contentSchema>;

export const PROVIDER_CONTENT_TYPES: Record<Provider, ContentCategory[]> = {
    instagram: ['image', 'video'],
    tiktok: ['video'],
    youtube: ['video'],
    spotify: ['music'],
    soundcloud: ['music'],
};

export const CATEGORY_LABELS: Record<ContentCategory, string> = {
    image: 'Images',
    video: 'Videos',
    music: 'Music',
};
