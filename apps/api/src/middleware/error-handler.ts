import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

export function onError(err: Error, c: Context) {
    if (err instanceof HTTPException) {
        return c.json(
            {
                error: err.message,
                status: err.status,
            },
            err.status
        );
    }

    console.error('Unhandled error:', err);

    return c.json(
        {
            error: 'Internal Server Error',
            status: 500,
        },
        500
    );
}
