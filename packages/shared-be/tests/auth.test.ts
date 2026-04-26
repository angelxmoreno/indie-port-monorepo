import { describe, expect, it } from 'bun:test';
import { AuthError, verifyToken } from '../src/auth';

type GetUserResult = {
    data: { user: { id: string; phone?: string | null } | null };
    error: { message: string; name: string } | null;
};

function createMockClient(getUserResult: GetUserResult) {
    return {
        auth: {
            getUser: () => Promise.resolve(getUserResult),
        },
    } as unknown as import('@supabase/supabase-js').SupabaseClient;
}

describe('AuthError', () => {
    it('sets name to AuthError', () => {
        const error = new AuthError('test message');
        expect(error.name).toBe('AuthError');
        expect(error.message).toBe('test message');
    });

    it('is an instance of Error', () => {
        const error = new AuthError('test');
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(AuthError);
    });
});

describe('verifyToken', () => {
    it('returns AuthenticatedUser on valid token', async () => {
        const client = createMockClient({
            data: {
                user: {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    phone: '+1234567890',
                },
            },
            error: null,
        });

        const result = await verifyToken('valid-token', client);
        expect(result).toEqual({
            userId: '123e4567-e89b-12d3-a456-426614174000',
            phone: '+1234567890',
        });
    });

    it('returns null phone when user has no phone', async () => {
        const client = createMockClient({
            data: {
                user: {
                    id: '123e4567-e89b-12d3-a456-426614174000',
                    phone: undefined,
                },
            },
            error: null,
        });

        const result = await verifyToken('valid-token', client);
        expect(result.phone).toBeNull();
    });

    it('throws AuthError on Supabase error', async () => {
        const client = createMockClient({
            data: { user: null },
            error: { message: 'Invalid token', name: 'AuthApiError' },
        });

        try {
            await verifyToken('invalid-token', client);
            expect.unreachable('Should have thrown');
        } catch (err) {
            expect(err).toBeInstanceOf(AuthError);
            expect((err as AuthError).message).toContain('Invalid token');
        }
    });

    it('throws AuthError when no user returned', async () => {
        const client = createMockClient({
            data: { user: null },
            error: null,
        });

        try {
            await verifyToken('valid-but-no-user', client);
            expect.unreachable('Should have thrown');
        } catch (err) {
            expect(err).toBeInstanceOf(AuthError);
            expect((err as AuthError).message).toBe('No user found for token');
        }
    });
});
