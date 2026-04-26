import type { AuthenticatedUser } from '@indieport/shared-types';
import { create } from 'zustand';
import { ApiClient } from '../api/client';
import { supabase } from './supabase-client';

interface AuthState {
    user: AuthenticatedUser | null;
    accessToken: string | null;
    isLoading: boolean;
    signInWithOtp: (phone: string) => Promise<void>;
    verifyOtp: (phone: string, token: string) => Promise<void>;
    signOut: () => Promise<void>;
}

let apiClient: ApiClient | null = null;

export function initApiClient(baseUrl: string) {
    apiClient = new ApiClient(baseUrl, async () => useAuth.getState().accessToken);
}

export function getApiClient(): ApiClient | null {
    return apiClient;
}

async function syncUserFromApi(): Promise<void> {
    if (!apiClient) return;
    try {
        const user = await apiClient.request<AuthenticatedUser>('/api/me');
        useAuth.setState({ user });
    } catch {
        // Keep existing user data if API call fails
    }
}

export const useAuth = create<AuthState>((set) => ({
    user: null,
    accessToken: null,
    isLoading: true,

    signInWithOtp: async (phone: string) => {
        const { error } = await supabase.auth.signInWithOtp({ phone });
        if (error) throw error;
    },

    verifyOtp: async (phone: string, token: string) => {
        const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
        if (error) throw error;
        await syncUserFromApi();
    },

    signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        set({ user: null, accessToken: null });
    },
}));

supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (session?.user) {
        useAuth.setState({
            user: { userId: session.user.id, phone: session.user.phone ?? null },
            accessToken: session.access_token,
            isLoading: false,
        });
        await syncUserFromApi();
    } else {
        useAuth.setState({ isLoading: false });
    }
});

supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
        useAuth.setState({
            user: { userId: session.user.id, phone: session.user.phone ?? null },
            accessToken: session.access_token,
        });
        void syncUserFromApi();
    } else {
        useAuth.setState({ user: null, accessToken: null });
    }
});
