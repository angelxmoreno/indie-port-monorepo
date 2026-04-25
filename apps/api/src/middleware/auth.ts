import { artists, db, eq } from '@indieport/database';
import { AuthError, getSupabase, verifyToken } from '@indieport/shared-be';
import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../types';

export async function authMiddleware(c: Context<Env>, next: Next) {
    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
        throw new HTTPException(401, { message: 'Missing Authorization header' });
    }

    const token = authHeader.replace(/^Bearer\s*/i, '');

    if (!token) {
        throw new HTTPException(401, { message: 'Invalid Authorization header format' });
    }

    try {
        const user = await verifyToken(token, getSupabase());

        await ensureArtistExists(user.userId);

        c.set('user', user);
        await next();
    } catch (err) {
        if (err instanceof AuthError) {
            throw new HTTPException(401, { message: err.message });
        }
        throw err;
    }
}

async function ensureArtistExists(userId: string) {
    const [existing] = await db.select({ id: artists.id }).from(artists).where(eq(artists.userId, userId)).limit(1);

    if (!existing) {
        await db.insert(artists).values({
            userId,
            subdomain: userId.slice(0, 8),
        });
    }
}
