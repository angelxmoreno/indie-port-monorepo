import type { AuthenticatedUser } from '@indieport/shared-types';
import { create } from 'zustand';
import { supabase } from './supabase-client';

interface AuthState {
    user: AuthenticatedUser | null;
    accessToken: string | null;
    isLoading: boolean;
    signInWithOtp: (phone: string) => Promise<void>;
    verifyOtp: (phone: string, token: string) => Promise<void>;
    signOut: () => Promise<void>;
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
    },

    signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        set({ user: null, accessToken: null });
    },
}));

supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
        useAuth.setState({
            user: { userId: session.user.id, phone: session.user.phone ?? null },
            accessToken: session.access_token,
            isLoading: false,
        });
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
    } else {
        useAuth.setState({ user: null, accessToken: null });
    }
});
