import type { AuthenticatedUser } from '@indieport/shared-types';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function verifyToken(token: string, client: SupabaseClient): Promise<AuthenticatedUser> {
    const { data, error } = await client.auth.getUser(token);

    if (error) {
        throw new AuthError(`Token verification failed: ${error.message}`);
    }

    if (!data.user) {
        throw new AuthError('No user found for token');
    }

    return {
        userId: data.user.id,
        phone: data.user.phone ?? null,
    };
}

export class AuthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AuthError';
    }
}
