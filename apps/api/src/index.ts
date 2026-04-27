import { and, artists, db, eq, socialConnections } from '@indieport/database';
import type { TokenResult } from '@indieport/shared-be';
import { decrypt, encrypt, InstagramContentProvider } from '@indieport/shared-be';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { authMiddleware } from './middleware/auth';
import { onError } from './middleware/error-handler';
import type { Env } from './types';

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

function getInstagramConfig() {
    return {
        clientId: requireEnv('INSTAGRAM_CLIENT_ID'),
        clientSecret: requireEnv('INSTAGRAM_CLIENT_SECRET'),
        redirectUri: requireEnv('INSTAGRAM_REDIRECT_URI'),
    };
}

function isUuid(str: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

async function getArtistByUserId(userId: string) {
    const artistRows = await db.select().from(artists).where(eq(artists.userId, userId)).limit(1);
    const artist = artistRows[0];
    if (!artist) {
        throw new HTTPException(404, { message: 'Artist not found' });
    }
    return artist;
}

const app = new Hono<Env>();

app.onError(onError);

app.use(
    cors({
        origin: process.env.CORS_ORIGIN?.split(',') ?? [
            'http://localhost:3002',
            'http://localhost:5173',
            'http://localhost:4321',
            'http://localhost:4322',
        ],
        credentials: true,
    })
);

app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/oauth/instagram/callback', async (c) => {
    const code = c.req.query('code');
    const error = c.req.query('error');
    const errorDescription = c.req.query('error_description');
    const dashboardUrl = process.env.DASHBOARD_URL ?? 'http://localhost:3002';

    if (error) {
        return c.redirect(
            `${dashboardUrl}/settings/instagram?connected=false&error=${encodeURIComponent(errorDescription || error)}`
        );
    }

    if (!code) {
        return c.redirect(`${dashboardUrl}/settings/instagram?connected=false&error=missing_code`);
    }

    const state = c.req.query('state');
    if (!state) {
        return c.redirect(`${dashboardUrl}/settings/instagram?connected=false&error=missing_state`);
    }

    let artistId: string;
    try {
        const decrypted = await decrypt(state, requireEnv('ENCRYPTION_KEY'));
        const payload = JSON.parse(decrypted) as Record<string, unknown>;
        artistId = String(payload.artistId);

        if (!isUuid(artistId)) {
            return c.redirect(`${dashboardUrl}/settings/instagram?connected=false&error=invalid_state`);
        }

        const issuedAt = Number(payload.issuedAt);
        if (Number.isNaN(issuedAt) || Date.now() - issuedAt > 10 * 60 * 1000) {
            return c.redirect(`${dashboardUrl}/settings/instagram?connected=false&error=expired_state`);
        }
    } catch {
        return c.redirect(`${dashboardUrl}/settings/instagram?connected=false&error=invalid_state`);
    }

    const provider = new InstagramContentProvider(getInstagramConfig());

    let tokenResult: TokenResult;
    try {
        tokenResult = await provider.exchangeCodeForTokens(code);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'token_exchange_failed';
        return c.redirect(`${dashboardUrl}/settings/instagram?connected=false&error=${encodeURIComponent(message)}`);
    }

    const encryptedAccessToken = await encrypt(tokenResult.accessToken, requireEnv('ENCRYPTION_KEY'));
    const encryptedRefreshToken = tokenResult.refreshToken
        ? await encrypt(tokenResult.refreshToken, requireEnv('ENCRYPTION_KEY'))
        : null;

    try {
        const existing = await db
            .select()
            .from(socialConnections)
            .where(and(eq(socialConnections.artistId, artistId), eq(socialConnections.provider, 'instagram')))
            .limit(1);

        if (existing.length > 0) {
            await db
                .update(socialConnections)
                .set({
                    accessToken: encryptedAccessToken,
                    refreshToken: encryptedRefreshToken,
                    tokenExpiresAt: tokenResult.tokenExpiresAt,
                    scopes: tokenResult.scopes,
                    modifiedAt: new Date(),
                })
                .where(and(eq(socialConnections.artistId, artistId), eq(socialConnections.provider, 'instagram')));
        } else {
            await db.insert(socialConnections).values({
                artistId,
                provider: 'instagram',
                accessToken: encryptedAccessToken,
                refreshToken: encryptedRefreshToken,
                tokenExpiresAt: tokenResult.tokenExpiresAt,
                scopes: tokenResult.scopes,
            });
        }
    } catch (err) {
        const dbMessage = err instanceof Error ? err.message : 'db_error';
        return c.redirect(`${dashboardUrl}/settings/instagram?connected=false&error=${encodeURIComponent(dbMessage)}`);
    }

    return c.redirect(`${dashboardUrl}/settings/instagram?connected=true`);
});

app.use('/api/*', authMiddleware);

app.get('/api/me', (c) => {
    return c.json(c.get('user'));
});

app.get('/api/me/connections', async (c) => {
    const user = c.get('user');
    const artist = await getArtistByUserId(user.userId);

    const connections = await db
        .select({
            id: socialConnections.id,
            provider: socialConnections.provider,
            scopes: socialConnections.scopes,
            tokenExpiresAt: socialConnections.tokenExpiresAt,
            createdAt: socialConnections.createdAt,
            modifiedAt: socialConnections.modifiedAt,
        })
        .from(socialConnections)
        .where(eq(socialConnections.artistId, artist.id));

    return c.json({ connections });
});

app.get('/api/oauth/instagram', async (c) => {
    const user = c.get('user');
    const artist = await getArtistByUserId(user.userId);

    const statePayload = JSON.stringify({
        artistId: artist.id,
        nonce: crypto.randomUUID(),
        issuedAt: Date.now(),
    });
    const state = await encrypt(statePayload, requireEnv('ENCRYPTION_KEY'));

    const provider = new InstagramContentProvider(getInstagramConfig());

    const authUrl = provider.getAuthorizationUrl({
        artistId: artist.id,
        state,
        redirectUri: getInstagramConfig().redirectUri,
    });

    return c.json({ authUrl });
});

const port = Number(process.env.PORT ?? 3001) || 3001;
console.log(`API server starting on port ${port}`);

export default {
    port,
    fetch: app.fetch,
};
