import { Hono } from 'hono';
import { authMiddleware } from './middleware/auth';
import { onError } from './middleware/error-handler';

const app = new Hono();

app.onError(onError);

app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/*', authMiddleware);

const port = Number(process.env.PORT ?? 3001) || 3001;
console.log(`API server starting on port ${port}`);

export default {
    port,
    fetch: app.fetch,
};
