import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginRequest, RegisterRequest } from '@/types/user';
import { userApi } from '@/services/api/user';
import { STORAGE_KEYS } from '@/config/constants';

interface UserState {
  // State
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: Error | null;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  getCurrentUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      // 初始状态
      user: null,
      token: null,
      isLoading: false,
      error: null,

      // Actions
      setUser: (user) => set({ user }),

      setToken: (token) => {
        set({ token });
        if (token) {
          localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        } else {
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
        }
      },

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
          const { user, token } = await userApi.login(credentials);

          set({
            user,
            token,
            isLoading: false,
          });

          localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        } catch (error) {
          set({
            isLoading: false,
            error: error as Error,
          });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const { user, token } = await userApi.register(data);

          set({
            user,
            token,
            isLoading: false,
          });

          localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        } catch (error) {
          set({
            isLoading: false,
            error: error as Error,
          });
          throw error;
        }
      },

      getCurrentUser: async () => {
        set({ isLoading: true, error: null });
        try {
          const user = await userApi.getCurrentUser();
          set({ user, isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            error: error as Error,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await userApi.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({ user: null, token: null });
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
        }
      },
    }),
    {
      name: STORAGE_KEYS.USER,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
);
