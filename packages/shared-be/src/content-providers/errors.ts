export class ProviderError extends Error {
    constructor(
        public provider: string,
        message: string
    ) {
        super(message);
        this.name = 'ProviderError';
    }
}

export class TokenExpiredError extends ProviderError {
    constructor(provider: string) {
        super(provider, `Access token expired for ${provider}`);
        this.name = 'TokenExpiredError';
    }
}

export class RateLimitError extends ProviderError {
    constructor(
        provider: string,
        public retryAfterMs: number
    ) {
        super(provider, `Rate limit exceeded for ${provider}. Retry after ${retryAfterMs}ms`);
        this.name = 'RateLimitError';
    }
}

export class ProviderApiError extends ProviderError {
    constructor(
        provider: string,
        public status: number,
        message: string
    ) {
        super(provider, message);
        this.name = 'ProviderApiError';
    }
}
