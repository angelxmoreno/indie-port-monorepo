import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth';
import { onError } from './middleware/error-handler';
import type { Env } from './types';

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

app.use('/api/*', authMiddleware);

app.get('/api/me', (c) => {
    return c.json(c.get('user'));
});

const port = Number(process.env.PORT ?? 3001) || 3001;
console.log(`API server starting on port ${port}`);

export default {
    port,
    fetch: app.fetch,
};
