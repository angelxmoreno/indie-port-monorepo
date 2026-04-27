import type { z } from 'zod';
import type {
    AuthorizationUrlParams,
    ContentItem,
    ContentProvider,
    FetchContentParams,
    TokenResult,
} from '../../content-providers';
import { ProviderApiError, RateLimitError, TokenExpiredError } from '../../content-providers';
import {
    instagramLongLivedTokenSchema,
    type instagramMediaItemSchema,
    instagramMediaSchema,
    instagramShortLivedTokenSchema,
} from './types';

interface InstagramClientConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}

function buildAuthUrl(params: URLSearchParams): string {
    return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

function getRateLimitRetryMs(headers: Headers): number {
    const retryAfter = headers.get('retry-after');
    if (retryAfter) return Number.parseInt(retryAfter, 10) * 1000;
    return 60000;
}

async function parseErrorMessage(response: Response): Promise<string> {
    try {
        const data = (await response.json()) as Record<string, unknown>;
        return typeof data.error_message === 'string' ? data.error_message : `Instagram API error: ${response.status}`;
    } catch {
        return `Instagram API error: ${response.status}`;
    }
}

export class InstagramContentProvider implements ContentProvider {
    readonly name = 'instagram';

    constructor(private readonly config: InstagramClientConfig) {}

    getAuthorizationUrl(params: AuthorizationUrlParams): string {
        const searchParams = new URLSearchParams({
            client_id: this.config.clientId,
            redirect_uri: params.redirectUri,
            scope: 'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish',
            response_type: 'code',
            state: params.state,
        });
        return buildAuthUrl(searchParams);
    }

    async exchangeCodeForTokens(code: string): Promise<TokenResult> {
        const shortLived = await this.exchangeCodeForShortLivedToken(code);
        const longLived = await this.exchangeForLongLivedToken(shortLived.access_token);
        return this.mapToTokenResult(longLived);
    }

    async refreshToken(refreshToken: string): Promise<TokenResult> {
        const url = new URL('https://graph.instagram.com/refresh_access_token');
        url.searchParams.set('grant_type', 'ig_refresh_token');
        url.searchParams.set('access_token', refreshToken);

        const response = await fetch(url.toString());

        if (!response.ok) {
            await this.handleErrorResponse(response);
        }

        const data = instagramLongLivedTokenSchema.parse(await response.json());
        return this.mapToTokenResult(data);
    }

    async fetchContent(accessToken: string, params: FetchContentParams): Promise<ContentItem[]> {
        const url = new URL('https://graph.instagram.com/me/media');
        url.searchParams.set('fields', 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp');
        url.searchParams.set('limit', String(params.limit));
        url.searchParams.set('access_token', accessToken);
        if (params.cursor) {
            url.searchParams.set('after', params.cursor);
        }

        const response = await fetch(url.toString());

        if (!response.ok) {
            await this.handleErrorResponse(response);
        }

        const data = instagramMediaSchema.parse(await response.json());
        return data.data.map((item) => this.mapToContentItem(item));
    }

    private async exchangeCodeForShortLivedToken(code: string) {
        const body = new URLSearchParams({
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            grant_type: 'authorization_code',
            redirect_uri: this.config.redirectUri,
            code,
        });

        const response = await fetch('https://api.instagram.com/oauth/access_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
        });

        if (!response.ok) {
            await this.handleErrorResponse(response);
        }

        return instagramShortLivedTokenSchema.parse(await response.json());
    }

    private async exchangeForLongLivedToken(shortLivedToken: string) {
        const url = new URL('https://graph.instagram.com/access_token');
        url.searchParams.set('grant_type', 'ig_exchange_token');
        url.searchParams.set('client_secret', this.config.clientSecret);
        url.searchParams.set('access_token', shortLivedToken);

        const response = await fetch(url.toString());

        if (!response.ok) {
            await this.handleErrorResponse(response);
        }

        return instagramLongLivedTokenSchema.parse(await response.json());
    }

    private async handleErrorResponse(response: Response): Promise<never> {
        const message = await parseErrorMessage(response);

        if (response.status === 429) {
            throw new RateLimitError('instagram', getRateLimitRetryMs(response.headers));
        }

        if (response.status === 401) {
            throw new TokenExpiredError('instagram');
        }

        throw new ProviderApiError('instagram', response.status, message);
    }

    private mapToTokenResult(data: z.infer<typeof instagramLongLivedTokenSchema>): TokenResult {
        const expiresInMs = data.expires_in * 1000;
        // Instagram long-lived tokens do not have a separate refresh token.
        // The same token is used for both access and refresh operations.
        return {
            accessToken: data.access_token,
            refreshToken: data.access_token,
            tokenExpiresAt: new Date(Date.now() + expiresInMs),
            scopes: [
                'instagram_business_basic',
                'instagram_business_manage_messages',
                'instagram_business_manage_comments',
                'instagram_business_content_publish',
            ],
        };
    }

    private mapToContentItem(item: z.infer<typeof instagramMediaItemSchema>): ContentItem {
        const { title, description } = this.splitCaption(item.caption);

        return {
            externalId: item.id,
            url: item.media_url ?? item.permalink ?? '',
            thumbnailUrl: item.thumbnail_url ?? item.media_url ?? null,
            title,
            description,
            metadata: {
                mediaType: item.media_type,
                permalink: item.permalink,
            },
            publishedAt: item.timestamp ? new Date(item.timestamp) : null,
            category: this.mapCategory(item.media_type),
        };
    }

    private mapCategory(mediaType: string): 'image' | 'video' | 'music' {
        switch (mediaType) {
            case 'IMAGE':
            case 'CAROUSEL_ALBUM':
                return 'image';
            case 'VIDEO':
                return 'video';
            default:
                return 'image';
        }
    }

    private splitCaption(caption: string | null): { title: string | null; description: string | null } {
        if (!caption) return { title: null, description: null };

        const trimmed = caption.trim();
        const newlineIndex = trimmed.indexOf('\n');

        if (newlineIndex === -1) {
            return { title: trimmed, description: null };
        }

        return {
            title: trimmed.slice(0, newlineIndex).trim(),
            description: trimmed.slice(newlineIndex + 1).trim(),
        };
    }
}
