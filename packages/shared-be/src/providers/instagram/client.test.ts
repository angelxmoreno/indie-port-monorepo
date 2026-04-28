import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { ProviderApiError, RateLimitError, TokenExpiredError } from '../../content-providers/errors';
import { InstagramContentProvider } from './client';

const TEST_CONFIG = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    redirectUri: 'https://example.com/callback',
};

function createProvider(): InstagramContentProvider {
    return new InstagramContentProvider(TEST_CONFIG);
}

function mockFetch(fn: (input: URL | RequestInfo) => Promise<Response>): void {
    globalThis.fetch = Object.assign(fn, { preconnect: async () => undefined }) as typeof fetch;
}

describe('InstagramContentProvider', () => {
    let originalFetch: typeof fetch;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    describe('getAuthorizationUrl', () => {
        it('returns a URL with all required params', () => {
            const provider = createProvider();
            const url = provider.getAuthorizationUrl({
                artistId: '123e4567-e89b-12d3-a456-426614174000',
                state: 'my-state',
                redirectUri: 'https://example.com/callback',
            });

            expect(url).toContain('https://www.instagram.com/oauth/authorize');
            expect(url).toContain('client_id=test-client-id');
            expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback');
            expect(url).toContain(
                'scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish'
            );
            expect(url).toContain('response_type=code');
            expect(url).toContain('state=my-state');
        });
    });

    describe('exchangeCodeForTokens', () => {
        it('exchanges code for long-lived token', async () => {
            mockFetch(async (input) => {
                const url = input.toString();

                if (url === 'https://api.instagram.com/oauth/access_token') {
                    return new Response(
                        JSON.stringify({
                            access_token: 'short-lived-token',
                            user_id: 123,
                        }),
                        { status: 200 }
                    );
                }

                if (url.startsWith('https://graph.instagram.com/access_token')) {
                    return new Response(
                        JSON.stringify({
                            access_token: 'long-lived-token',
                            token_type: 'bearer',
                            expires_in: 5184000,
                        }),
                        { status: 200 }
                    );
                }

                return new Response('Not Found', { status: 404 });
            });

            const provider = createProvider();
            const result = await provider.exchangeCodeForTokens('auth-code');

            expect(result.accessToken).toBe('long-lived-token');
            expect(result.refreshToken).toBe('long-lived-token');
            expect(result.scopes).toEqual([
                'instagram_business_basic',
                'instagram_business_manage_messages',
                'instagram_business_manage_comments',
                'instagram_business_content_publish',
            ]);
            expect(result.tokenExpiresAt).toBeInstanceOf(Date);
        });

        it('throws ProviderApiError on invalid code', async () => {
            mockFetch(
                async () =>
                    new Response(JSON.stringify({ error_message: 'Invalid authorization code' }), { status: 400 })
            );

            const provider = createProvider();
            await expect(provider.exchangeCodeForTokens('bad-code')).rejects.toBeInstanceOf(ProviderApiError);
        });

        it('throws RateLimitError on 429', async () => {
            mockFetch(
                async () =>
                    new Response(JSON.stringify({ error_message: 'Rate limit exceeded' }), {
                        status: 429,
                        headers: { 'retry-after': '120' },
                    })
            );

            const provider = createProvider();
            await expect(provider.exchangeCodeForTokens('code')).rejects.toBeInstanceOf(RateLimitError);
        });

        it('throws TokenExpiredError on 401', async () => {
            mockFetch(async () => new Response(JSON.stringify({ error_message: 'Token expired' }), { status: 401 }));

            const provider = createProvider();
            await expect(provider.exchangeCodeForTokens('code')).rejects.toBeInstanceOf(TokenExpiredError);
        });
    });

    describe('refreshToken', () => {
        it('returns a new token with updated expiry', async () => {
            mockFetch(
                async () =>
                    new Response(
                        JSON.stringify({
                            access_token: 'refreshed-token',
                            token_type: 'bearer',
                            expires_in: 5184000,
                        }),
                        { status: 200 }
                    )
            );

            const provider = createProvider();
            const result = await provider.refreshToken('old-token');

            expect(result.accessToken).toBe('refreshed-token');
            expect(result.refreshToken).toBe('refreshed-token');
            expect(result.tokenExpiresAt).toBeInstanceOf(Date);
        });
    });

    describe('fetchContent', () => {
        it('maps IMAGE media_type to image category', async () => {
            mockFetch(
                async () =>
                    new Response(
                        JSON.stringify({
                            data: [
                                {
                                    id: '1',
                                    caption: 'Photo caption',
                                    media_type: 'IMAGE',
                                    media_url: 'https://cdn.instagram.com/photo.jpg',
                                    thumbnail_url: null,
                                    permalink: 'https://instagram.com/p/abc',
                                    timestamp: '2024-01-01T00:00:00Z',
                                },
                            ],
                        }),
                        { status: 200 }
                    )
            );

            const provider = createProvider();
            const items = await provider.fetchContent('token', { limit: 10 });

            expect(items).toHaveLength(1);
            expect(items[0].category).toBe('image');
            expect(items[0].externalId).toBe('1');
            expect(items[0].url).toBe('https://cdn.instagram.com/photo.jpg');
        });

        it('maps VIDEO media_type to video category', async () => {
            mockFetch(
                async () =>
                    new Response(
                        JSON.stringify({
                            data: [
                                {
                                    id: '2',
                                    caption: 'Video caption',
                                    media_type: 'VIDEO',
                                    media_url: 'https://cdn.instagram.com/video.mp4',
                                    thumbnail_url: 'https://cdn.instagram.com/thumb.jpg',
                                    permalink: 'https://instagram.com/p/def',
                                    timestamp: '2024-01-02T00:00:00Z',
                                },
                            ],
                        }),
                        { status: 200 }
                    )
            );

            const provider = createProvider();
            const items = await provider.fetchContent('token', { limit: 10 });

            expect(items[0].category).toBe('video');
            expect(items[0].thumbnailUrl).toBe('https://cdn.instagram.com/thumb.jpg');
        });

        it('maps CAROUSEL_ALBUM to image category', async () => {
            mockFetch(
                async () =>
                    new Response(
                        JSON.stringify({
                            data: [
                                {
                                    id: '3',
                                    caption: 'Carousel caption',
                                    media_type: 'CAROUSEL_ALBUM',
                                    media_url: 'https://cdn.instagram.com/carousel.jpg',
                                    thumbnail_url: null,
                                    permalink: 'https://instagram.com/p/ghi',
                                    timestamp: '2024-01-03T00:00:00Z',
                                },
                            ],
                        }),
                        { status: 200 }
                    )
            );

            const provider = createProvider();
            const items = await provider.fetchContent('token', { limit: 10 });

            expect(items[0].category).toBe('image');
        });

        it('splits caption on newline into title and description', async () => {
            mockFetch(
                async () =>
                    new Response(
                        JSON.stringify({
                            data: [
                                {
                                    id: '4',
                                    caption: 'Title line\nDescription line 1\nDescription line 2',
                                    media_type: 'IMAGE',
                                    media_url: 'https://cdn.instagram.com/photo.jpg',
                                    thumbnail_url: null,
                                    permalink: 'https://instagram.com/p/jkl',
                                    timestamp: '2024-01-04T00:00:00Z',
                                },
                            ],
                        }),
                        { status: 200 }
                    )
            );

            const provider = createProvider();
            const items = await provider.fetchContent('token', { limit: 10 });

            expect(items[0].title).toBe('Title line');
            expect(items[0].description).toBe('Description line 1\nDescription line 2');
        });

        it('handles null caption gracefully', async () => {
            mockFetch(
                async () =>
                    new Response(
                        JSON.stringify({
                            data: [
                                {
                                    id: '5',
                                    caption: null,
                                    media_type: 'IMAGE',
                                    media_url: 'https://cdn.instagram.com/photo.jpg',
                                    thumbnail_url: null,
                                    permalink: 'https://instagram.com/p/mno',
                                    timestamp: '2024-01-05T00:00:00Z',
                                },
                            ],
                        }),
                        { status: 200 }
                    )
            );

            const provider = createProvider();
            const items = await provider.fetchContent('token', { limit: 10 });

            expect(items[0].title).toBeNull();
            expect(items[0].description).toBeNull();
        });

        it('passes cursor as after parameter', async () => {
            let capturedUrl = '';
            mockFetch(async (input) => {
                capturedUrl = input.toString();
                return new Response(JSON.stringify({ data: [] }), { status: 200 });
            });

            const provider = createProvider();
            await provider.fetchContent('token', { limit: 25, cursor: 'cursor123' });

            expect(capturedUrl).toContain('after=cursor123');
            expect(capturedUrl).toContain('limit=25');
        });

        it('throws TokenExpiredError on 401', async () => {
            mockFetch(
                async () => new Response(JSON.stringify({ error_message: 'Access token expired' }), { status: 401 })
            );

            const provider = createProvider();
            await expect(provider.fetchContent('token', { limit: 10 })).rejects.toBeInstanceOf(TokenExpiredError);
        });
    });
});
