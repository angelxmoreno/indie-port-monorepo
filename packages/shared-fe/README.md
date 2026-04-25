# @indieport/shared-fe

Shared frontend utilities for IndiePort. Provides Zustand-based auth store and an authenticated API client.

## Setup

Consuming apps must provide these Vite environment variables:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_API_URL` | API base URL (defaults to `/api`) |

The auth store auto-initializes on import — it restores the Supabase session and subscribes to auth state changes. No provider wrapping needed.

## Available Scripts

| Script | Description |
|--------|-------------|
| `bun run build` | Compile TypeScript |
| `bun run type:check` | TypeScript type checking |
| `bun run lint` | Biome lint check |
| `bun run lint:fix` | Biome lint + auto-fix |
| `bun test` | Run tests |

## Exports

### Auth

#### `useAuth`

Zustand store hook for auth state. No provider required.

```ts
const { user, accessToken, isLoading, signInWithOtp, verifyOtp, signOut } = useAuth();
```

| Property | Type | Description |
|----------|------|-------------|
| `user` | `AuthenticatedUser \| null` | Current user (`{ userId, phone }`) |
| `accessToken` | `string \| null` | Supabase JWT from current session |
| `isLoading` | `boolean` | True during initial session restore |
| `signInWithOtp` | `(phone: string) => Promise<void>` | Send SMS OTP to phone number |
| `verifyOtp` | `(phone: string, token: string) => Promise<void>` | Verify SMS OTP code |
| `signOut` | `() => Promise<void>` | Sign out and clear session |

For non-React contexts, use `useAuth.getState()` to read the store synchronously.

#### `supabase`

```ts
const supabase: SupabaseClient
```

Pre-initialized Supabase browser client. Reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at module load time. Throws if either is missing.

### API

#### `apiClient`

```ts
function apiClient<T>(path: string, options?: RequestInit): Promise<T>
```

Authenticated fetch wrapper. Auto-attaches `Authorization: Bearer <token>` from the Zustand auth store. Defaults `Content-Type` to `application/json` when a body is present. Prepends `VITE_API_URL` (or `/api`) to the path. Throws `ApiError` on non-2xx responses.

#### `ApiError`

```ts
class ApiError extends Error {
  status: number;
  constructor(status: number, message: string);
}
```

Error class for API failures. `status` holds the HTTP status code. `message` is extracted from the response JSON (`body.error` or `body.message`).

## Usage

```tsx
// Any component — no provider needed
import { useAuth } from '@indieport/shared-fe';

function Profile() {
  const { user, signOut } = useAuth();
  return <button onClick={signOut}>Sign out {user?.phone}</button>;
}

// API calls
import { apiClient } from '@indieport/shared-fe';

const data = await apiClient<Artist>('/artists/me');
```