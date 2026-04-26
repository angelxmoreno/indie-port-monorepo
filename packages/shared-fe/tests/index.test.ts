import { describe, expect, it, mock } from 'bun:test';
import { ApiClient, ApiError } from '../src/api/client';

describe('ApiClient', () => {
    const baseUrl = 'http://localhost:3001';

    it('attaches Authorization header with Bearer token', async () => {
        const fetchMock = mock<typeof fetch>((_input, init) => {
            const headers = init?.headers as Headers;
            expect(headers.get('Authorization')).toBe('Bearer test-token');
            return Promise.resolve(new Response(JSON.stringify({ id: 1 }), { status: 200 }));
        });
        global.fetch = fetchMock;

        const client = new ApiClient(baseUrl, async () => 'test-token');
        await client.request('/api/me');

        expect(fetchMock).toHaveBeenCalled();
    });

    it('does not attach Authorization header when token is null', async () => {
        const fetchMock = mock<typeof fetch>((_input, init) => {
            const headers = init?.headers as Headers;
            expect(headers.get('Authorization')).toBeNull();
            return Promise.resolve(new Response(JSON.stringify({ id: 1 }), { status: 200 }));
        });
        global.fetch = fetchMock;

        const client = new ApiClient(baseUrl, async () => null);
        await client.request('/api/me');

        expect(fetchMock).toHaveBeenCalled();
    });

    it('throws ApiError on non-ok response', async () => {
        global.fetch = mock<typeof fetch>(() =>
            Promise.resolve(new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 }))
        );

        const client = new ApiClient(baseUrl, async () => 'token');
        await expect(client.request('/api/unknown')).rejects.toThrow(ApiError);
    });

    it('sets ApiError status from response', async () => {
        global.fetch = mock<typeof fetch>(() =>
            Promise.resolve(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }))
        );

        const client = new ApiClient(baseUrl, async () => 'token');
        try {
            await client.request('/api/me');
            expect.unreachable('Should have thrown');
        } catch (err) {
            expect(err).toBeInstanceOf(ApiError);
            if (err instanceof ApiError) {
                expect(err.status).toBe(401);
                expect(err.message).toBe('Unauthorized');
            }
        }
    });

    it('uses message field as fallback error text', async () => {
        global.fetch = mock<typeof fetch>(() =>
            Promise.resolve(new Response(JSON.stringify({ message: 'Bad Request' }), { status: 400 }))
        );

        const client = new ApiClient(baseUrl, async () => 'token');
        try {
            await client.request('/api/me');
            expect.unreachable('Should have thrown');
        } catch (err) {
            expect(err).toBeInstanceOf(ApiError);
            if (err instanceof ApiError) {
                expect(err.message).toBe('Bad Request');
            }
        }
    });
});
