import { describe, expect, it } from 'bun:test';
import app from '../src/index';

describe('GET /health', () => {
    it('returns ok status', async () => {
        const res = await app.fetch(new Request('http://localhost/health'));
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.status).toBe('ok');
        expect(body.timestamp).toBeString();
    });
});
