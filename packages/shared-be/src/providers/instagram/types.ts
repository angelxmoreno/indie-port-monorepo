import { z } from 'zod';

export const instagramShortLivedTokenSchema = z.object({
    access_token: z.string(),
    user_id: z.number(),
});

export type InstagramShortLivedToken = z.infer<typeof instagramShortLivedTokenSchema>;

export const instagramLongLivedTokenSchema = z.object({
    access_token: z.string(),
    token_type: z.string(),
    expires_in: z.number(),
});

export type InstagramLongLivedToken = z.infer<typeof instagramLongLivedTokenSchema>;

export const instagramMediaItemSchema = z.object({
    id: z.string(),
    caption: z.string().nullable(),
    media_type: z.enum(['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM']),
    media_url: z.string().url().nullish(),
    thumbnail_url: z.string().url().nullish(),
    permalink: z.string().url().nullish(),
    timestamp: z.string(),
});

export type InstagramMediaItem = z.infer<typeof instagramMediaItemSchema>;

export const instagramMediaSchema = z.object({
    data: z.array(instagramMediaItemSchema),
    paging: z
        .object({
            cursors: z.object({
                after: z.string().optional(),
                before: z.string().optional(),
            }),
            next: z.string().url().optional(),
        })
        .optional(),
});

export type InstagramMedia = z.infer<typeof instagramMediaSchema>;
