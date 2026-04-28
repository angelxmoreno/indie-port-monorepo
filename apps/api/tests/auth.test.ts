import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { AuthError } from '@indieport/shared-be';
import type { AuthMiddlewareDeps } from '../src/middleware/auth';
import { authMiddleware } from '../src/middleware/auth';

const mockVerifyToken = mock<(token: string, client: unknown) => Promise<unknown>>();

function createChainableMock(resolvedValue: unknown) {
    const chain = {
        from: mock(() => chain),
        where: mock(() => chain),
        limit: mock(() => Promise.resolve(resolvedValue)),
    };
    return chain;
}

mock.module('@indieport/database', () => ({
    db: {
        select: mock(() => createChainableMock([])),
        insert: mock(() => ({
            values: mock(() => ({
                onConflictDoNothing: mock(() => Promise.resolve([])),
            })),
        })),
    },
    artists: {
        id: 'id',
        userId: 'user_id',
    },
    eq: mock((_col: unknown, _val: unknown) => ({})),
}));

import { Hono } from 'hono';
import { onError } from '../src/middleware/error-handler';
import type { Env } from '../src/types';

const { db: mockDb } = require('@indieport/database') as {
    db: { select: ReturnType<typeof mock>; insert: ReturnType<typeof mock> };
};

function createApp(deps?: AuthMiddlewareDeps) {
    const app = new Hono<Env>();
    app.onError(onError);
    app.use('/api/*', (c, next) => authMiddleware(c, next, deps));
    app.get('/api/test', (c) => {
        const user = c.get('user');
        return c.json({ userId: user.userId });
    });
    app.get('/api/me', (c) => {
        return c.json(c.get('user'));
    });
    return app;
}

describe('authMiddleware', () => {
    beforeEach(() => {
        mockVerifyToken.mockReset();
        mockDb.select.mockReset();
        mockDb.insert.mockReset();
        mockDb.insert.mockImplementation(() => ({
            values: mock(() => ({
                onConflictDoNothing: mock(() => Promise.resolve([])),
            })),
        }));
    });

    it('returns 401 when Authorization header is missing', async () => {
        const app = createApp();
        const res = await app.request('/api/test');
        expect(res.status).toBe(401);

        const body = await res.json();
        expect(body.error).toBe('Missing Authorization header');
    });

    it('returns 401 when Authorization header has no token after Bearer', async () => {
        const app = createApp();
        const res = await app.request('/api/test', {
            headers: { Authorization: 'Bearer ' },
        });
        expect(res.status).toBe(401);

        const body = await res.json();
        expect(body.error).toBe('Invalid Authorization header format');
    });

    it('returns 401 when token verification fails', async () => {
        mockVerifyToken.mockRejectedValue(new AuthError('Token verification failed: Invalid token'));

        const app = createApp({
            verifyToken: mockVerifyToken,
            getSupabase: () => ({}) as unknown as import('@supabase/supabase-js').SupabaseClient,
        });
        const res = await app.request('/api/test', {
            headers: { Authorization: 'Bearer invalid-token' },
        });
        expect(res.status).toBe(401);

        const body = await res.json();
        expect(body.error).toContain('Token verification failed');
    });

    it('sets user and calls next when token is valid and artist exists', async () => {
        const user = { userId: '123e4567-e89b-12d3-a456-426614174000', phone: '+1234567890' };
        mockVerifyToken.mockResolvedValue(user);
        mockDb.select.mockImplementation(() => createChainableMock([{ id: 'existing-id' }]));

        const app = createApp({
            verifyToken: mockVerifyToken,
            getSupabase: () => ({}) as unknown as import('@supabase/supabase-js').SupabaseClient,
        });
        const res = await app.request('/api/test', {
            headers: { Authorization: 'Bearer valid-token' },
        });
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.userId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('creates artist row when user is valid but artist does not exist', async () => {
        const user = { userId: '123e4567-e89b-12d3-a456-426614174000', phone: null };
        mockVerifyToken.mockResolvedValue(user);
        mockDb.select.mockImplementation(() => createChainableMock([]));
        mockDb.insert.mockImplementation(() => ({
            values: mock(() => ({
                onConflictDoNothing: mock(() => Promise.resolve([])),
            })),
        }));

        const app = createApp({
            verifyToken: mockVerifyToken,
            getSupabase: () => ({}) as unknown as import('@supabase/supabase-js').SupabaseClient,
        });
        const res = await app.request('/api/test', {
            headers: { Authorization: 'Bearer valid-token' },
        });
        expect(res.status).toBe(200);
        expect(mockDb.insert).toHaveBeenCalled();
    });
});

describe('GET /api/me', () => {
    beforeEach(() => {
        mockVerifyToken.mockReset();
    });

    it('returns 401 when no Authorization header', async () => {
        const app = createApp();
        const res = await app.request('/api/me');
        expect(res.status).toBe(401);

        const body = await res.json();
        expect(body.error).toBe('Missing Authorization header');
    });

    it('returns 200 with user when token is valid', async () => {
        const user = { userId: '123e4567-e89b-12d3-a456-426614174000', phone: '+1234567890' };
        mockVerifyToken.mockResolvedValue(user);

        const app = createApp({
            verifyToken: mockVerifyToken,
            getSupabase: () => ({}) as unknown as import('@supabase/supabase-js').SupabaseClient,
        });
        const res = await app.request('/api/me', {
            headers: { Authorization: 'Bearer valid-token' },
        });
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body).toEqual(user);
    });
});
