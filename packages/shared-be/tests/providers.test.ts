import { describe, expect, it } from 'bun:test';
import {
    authorizationUrlParamsSchema,
    contentItemSchema,
    fetchContentParamsSchema,
    ProviderApiError,
    ProviderError,
    RateLimitError,
    TokenExpiredError,
    tokenResultSchema,
} from '../src/content-providers';

describe('ProviderError', () => {
    it('is an instance of Error', () => {
        const err = new ProviderError('instagram', 'Something went wrong');
        expect(err).toBeInstanceOf(Error);
        expect(err.provider).toBe('instagram');
        expect(err.message).toBe('Something went wrong');
    });
});

describe('TokenExpiredError', () => {
    it('is a ProviderError with expired token message', () => {
        const err = new TokenExpiredError('instagram');
        expect(err).toBeInstanceOf(ProviderError);
        expect(err.provider).toBe('instagram');
        expect(err.message).toContain('expired');
    });
});

describe('RateLimitError', () => {
    it('is a ProviderError with retryAfterMs', () => {
        const err = new RateLimitError('instagram', 5000);
        expect(err).toBeInstanceOf(ProviderError);
        expect(err.retryAfterMs).toBe(5000);
        expect(err.message).toContain('Rate limit');
    });
});

describe('ProviderApiError', () => {
    it('is a ProviderError with status code', () => {
        const err = new ProviderApiError('instagram', 400, 'Bad Request');
        expect(err).toBeInstanceOf(ProviderError);
        expect(err.status).toBe(400);
        expect(err.message).toBe('Bad Request');
    });
});

describe('tokenResultSchema', () => {
    it('parses a valid token result', () => {
        const result = tokenResultSchema.parse({
            accessToken: 'token123',
            refreshToken: 'refresh456',
            tokenExpiresAt: new Date('2026-01-01'),
            scopes: ['read', 'write'],
        });
        expect(result.accessToken).toBe('token123');
        expect(result.scopes).toEqual(['read', 'write']);
    });

    it('allows null refreshToken', () => {
        const result = tokenResultSchema.parse({
            accessToken: 'token123',
            refreshToken: null,
            tokenExpiresAt: null,
            scopes: [],
        });
        expect(result.refreshToken).toBeNull();
    });
});

describe('contentItemSchema', () => {
    it('parses a valid content item', () => {
        const item = contentItemSchema.parse({
            externalId: 'abc123',
            url: 'https://example.com/image.jpg',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            title: 'My Image',
            description: 'A nice image',
            metadata: { likes: 10 },
            publishedAt: new Date('2026-01-01'),
            category: 'image',
        });
        expect(item.externalId).toBe('abc123');
        expect(item.category).toBe('image');
    });

    it('allows null optional fields', () => {
        const item = contentItemSchema.parse({
            externalId: 'abc123',
            url: 'https://example.com/image.jpg',
            thumbnailUrl: null,
            title: null,
            description: null,
            metadata: null,
            publishedAt: null,
            category: 'video',
        });
        expect(item.title).toBeNull();
    });
});

describe('fetchContentParamsSchema', () => {
    it('uses defaults for empty input', () => {
        const params = fetchContentParamsSchema.parse({
            limit: undefined,
            cursor: undefined,
        });
        expect(params.limit).toBe(50);
        expect(params.cursor).toBeUndefined();
    });

    it('enforces max limit of 100', () => {
        expect(() => fetchContentParamsSchema.parse({ limit: 200 })).toThrow();
    });
});

describe('authorizationUrlParamsSchema', () => {
    it('parses valid params', () => {
        const params = authorizationUrlParamsSchema.parse({
            artistId: '123e4567-e89b-12d3-a456-426614174000',
            state: 'random-state-123',
            redirectUri: 'https://example.com/callback',
        });
        expect(params.artistId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('rejects invalid UUID', () => {
        expect(() =>
            authorizationUrlParamsSchema.parse({
                artistId: 'not-a-uuid',
                state: 'state',
                redirectUri: 'https://example.com',
            })
        ).toThrow();
    });
});
