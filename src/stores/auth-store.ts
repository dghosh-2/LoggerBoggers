import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
    id: string;
    username: string;
    displayName: string;
    isPlaidConnected?: boolean;
}

interface AuthState {
    user: User | null;
    isLoading: boolean;
    isInitialized: boolean;

    // Actions
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    setInitialized: (initialized: boolean) => void;
    login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
    signup: (username: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            isLoading: false,
            isInitialized: false,

            setUser: (user) => set({ user }),
            setLoading: (isLoading) => set({ isLoading }),
            setInitialized: (isInitialized) => set({ isInitialized }),

            login: async (username, password) => {
                set({ isLoading: true });
                try {
                    const response = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password }),
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        set({ isLoading: false });
                        return { success: false, error: data.error || 'Login failed' };
                    }

                    set({ user: data.user, isLoading: false });
                    return { success: true };
                } catch (error) {
                    set({ isLoading: false });
                    return { success: false, error: 'Network error' };
                }
            },

            signup: async (username, password, displayName) => {
                set({ isLoading: true });
                try {
                    const response = await fetch('/api/auth/signup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username, password, displayName }),
                    });

                    const data = await response.json();

                    if (!response.ok) {
                        set({ isLoading: false });
                        return { success: false, error: data.error || 'Signup failed' };
                    }

                    set({ user: data.user, isLoading: false });
                    return { success: true };
                } catch (error) {
                    set({ isLoading: false });
                    return { success: false, error: 'Network error' };
                }
            },

            logout: async () => {
                set({ isLoading: true });
                try {
                    await fetch('/api/auth/logout', { method: 'POST' });
                } catch (error) {
                    console.error('Logout error:', error);
                }
                set({ user: null, isLoading: false });
            },

            checkSession: async () => {
                try {
                    const response = await fetch('/api/auth/session');
                    const data = await response.json();
                    set({ user: data.user, isInitialized: true });
                } catch (error) {
                    console.error('Session check error:', error);
                    set({ user: null, isInitialized: true });
                }
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ user: state.user }),
        }
    )
);
