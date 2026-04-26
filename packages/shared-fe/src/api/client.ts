export type TokenFetcher = () => Promise<string | null | undefined>;

export class ApiClient {
    private readonly baseUrl: string;
    private readonly tokenFetcher: TokenFetcher;

    constructor(baseUrl: string, tokenFetcher: TokenFetcher) {
        this.baseUrl = baseUrl;
        this.tokenFetcher = tokenFetcher;
    }

    async request<T>(path: string, options: RequestInit = {}): Promise<T> {
        const token = await this.tokenFetcher();

        const headers = new Headers(options.headers);

        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        if (!headers.has('Content-Type') && options.body) {
            headers.set('Content-Type', 'application/json');
        }

        const response = await fetch(`${this.baseUrl}${path}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const body = await response.json().catch(() => ({ error: response.statusText }));
            throw new ApiError(response.status, body.error ?? body.message ?? 'Unknown error');
        }

        return (await response.json()) as Promise<T>;
    }
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
