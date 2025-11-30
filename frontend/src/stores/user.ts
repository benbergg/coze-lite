import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginRequest } from '@/types/user';
import { STORAGE_KEYS } from '@/config/constants';

interface UserState {
  // State
  user: User | null;
  token: string | null;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      // 初始状态
      user: null,
      token: null,
      isLoading: false,

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
        set({ isLoading: true });
        try {
          // TODO: 替换为真实 API 调用
          // 模拟登录
          await new Promise((resolve) => setTimeout(resolve, 500));

          const mockUser: User = {
            id: '1',
            username: credentials.username,
            email: `${credentials.username}@example.com`,
          };

          const mockToken = 'mock-token-' + Date.now();

          set({
            user: mockUser,
            token: mockToken,
            isLoading: false,
          });

          localStorage.setItem(STORAGE_KEYS.TOKEN, mockToken);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({ user: null, token: null });
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
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
