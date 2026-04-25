import { useAuth } from '../auth';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export async function apiClient<T>(path: string, options: RequestInit = {}): Promise<T> {
    const { accessToken } = useAuth.getState();

    const headers = new Headers(options.headers);

    if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
    }

    if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const body = await response.json().catch(() => ({ error: response.statusText }));
        throw new ApiError(response.status, body.error ?? body.message ?? 'Unknown error');
    }

    return (await response.json()) as Promise<T>;
}

export class ApiError extends Error {
    constructor(
        public status: number,
        message: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
}
