import { z } from 'zod';

export const tokenResultSchema = z.object({
    accessToken: z.string(),
    refreshToken: z.string().nullable(),
    tokenExpiresAt: z.date().nullable(),
    scopes: z.array(z.string()),
});

export type TokenResult = z.infer<typeof tokenResultSchema>;

export const contentItemSchema = z.object({
    externalId: z.string().min(1).max(255),
    url: z.string(),
    thumbnailUrl: z.string().nullable(),
    title: z.string().nullable(),
    description: z.string().nullable(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
    publishedAt: z.date().nullable(),
    category: z.enum(['image', 'video', 'music']),
});

export type ContentItem = z.infer<typeof contentItemSchema>;

export const fetchContentParamsSchema = z.object({
    limit: z.number().int().min(1).max(100).default(50),
    cursor: z.string().nullable().optional(),
});

export type FetchContentParams = z.infer<typeof fetchContentParamsSchema>;

export const authorizationUrlParamsSchema = z.object({
    artistId: z.string().uuid(),
    state: z.string().min(1),
    redirectUri: z.string(),
});

export type AuthorizationUrlParams = z.infer<typeof authorizationUrlParamsSchema>;

export interface ContentProvider {
    readonly name: string;

    getAuthorizationUrl(params: AuthorizationUrlParams): string;

    exchangeCodeForTokens(code: string): Promise<TokenResult>;

    refreshToken(refreshToken: string): Promise<TokenResult>;

    fetchContent(accessToken: string, params: FetchContentParams): Promise<ContentItem[]>;
}
