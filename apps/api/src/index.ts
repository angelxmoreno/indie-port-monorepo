import { Hono } from 'hono';

const app = new Hono();

app.get('/health', (c) => {
    return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const port = Number(process.env.PORT ?? 3001) || 3001;
console.log(`API server starting on port ${port}`);

export default {
    port,
    fetch: app.fetch,
};
