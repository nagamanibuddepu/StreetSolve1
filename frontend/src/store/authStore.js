import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(persist(
  (set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,

    setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
    setUser: (user) => set({ user }),
    logout: () => {
      localStorage.removeItem('ss_token');
      set({ user: null, token: null, isAuthenticated: false });
    },
    setLoading: (v) => set({ isLoading: v }),
  }),
  {
    name: 'streetsolve-auth',
    partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
    onRehydrateStorage: () => (state) => {
      if (state?.token) localStorage.setItem('ss_token', state.token);
    },
  }
));
