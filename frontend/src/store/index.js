/**
 * Global State – Zustand stores for auth, issues, notifications, UI
 */
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import api from './services/api';

// ─── Auth Store ───────────────────────────────────────────────────────────────
export const useAuthStore = create(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        token: null,
        loading: false,
        error: null,

        setUser: (user) => set({ user }),
        setToken: (token) => set({ token }),
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),

        login: async (credentials, method = 'email') => {
          set({ loading: true, error: null });
          try {
            const endpoint = {
              email: '/auth/login/email',
              otp: '/auth/otp/verify',
              google: '/auth/google',
              govid: '/auth/login/govid',
            }[method];
            const { data } = await api.post(endpoint, credentials);
            set({ user: data.user, token: data.token, loading: false });
            api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
            return { success: true };
          } catch (err) {
            const msg = err.response?.data?.message || 'Login failed';
            set({ error: msg, loading: false });
            return { success: false, message: msg };
          }
        },

        register: async (userData) => {
          set({ loading: true, error: null });
          try {
            const { data } = await api.post('/auth/register', userData);
            set({ user: data.user, token: data.token, loading: false });
            api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
            return { success: true };
          } catch (err) {
            const msg = err.response?.data?.message || 'Registration failed';
            set({ error: msg, loading: false });
            return { success: false, message: msg };
          }
        },

        logout: () => {
          set({ user: null, token: null });
          delete api.defaults.headers.common['Authorization'];
          api.post('/auth/logout').catch(() => {});
        },

        fetchMe: async () => {
          const token = get().token;
          if (!token) return;
          try {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            const { data } = await api.get('/auth/me');
            set({ user: data.data });
          } catch {
            set({ user: null, token: null });
          }
        },

        updateProfile: async (updates) => {
          const { data } = await api.put('/auth/profile', updates);
          set({ user: data.data });
          return data;
        },
      }),
      { name: 'streetsolve-auth', partialize: (s) => ({ token: s.token, user: s.user }) }
    )
  )
);

// ─── UI Store ─────────────────────────────────────────────────────────────────
export const useUIStore = create((set) => ({
  language: 'en',
  setLanguage: (lang) => set({ language: lang }),

  sidebarOpen: false,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),

  theme: 'light',
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),

  activePage: 'home',
  setActivePage: (page) => set({ activePage: page }),
}));

// ─── Issues Store ─────────────────────────────────────────────────────────────
export const useIssueStore = create((set, get) => ({
  issues: [],
  currentIssue: null,
  pagination: { page: 1, total: 0, pages: 0, hasNext: false },
  filters: { status: '', category: '', sortBy: 'createdAt', search: '' },
  loading: false,
  error: null,

  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters } })),
  setCurrentIssue: (issue) => set({ currentIssue: issue }),

  fetchIssues: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const query = new URLSearchParams({
        ...filters,
        ...params,
        page: params.page || 1,
        limit: 20,
      });
      // Remove empty
      for (const [k, v] of [...query]) { if (!v) query.delete(k); }

      const { data } = await api.get(`/issues?${query}`);
      set({
        issues: data.data,
        pagination: data.pagination,
        loading: false,
      });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  fetchIssue: async (id) => {
    set({ loading: true });
    try {
      const { data } = await api.get(`/issues/${id}`);
      set({ currentIssue: data.data, loading: false });
      return data.data;
    } catch (err) {
      set({ error: err.message, loading: false });
      return null;
    }
  },

  createIssue: async (formData) => {
    const { data } = await api.post('/issues', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    set((s) => ({ issues: [data.data, ...s.issues] }));
    return data;
  },

  voteIssue: async (id) => {
    const { data } = await api.post(`/issues/${id}/vote`);
    set((s) => ({
      issues: s.issues.map(i => i._id === id ? { ...i, voteCount: data.data.voteCount, hasVoted: data.data.hasVoted } : i),
      currentIssue: s.currentIssue?._id === id ? { ...s.currentIssue, voteCount: data.data.voteCount, hasVoted: data.data.hasVoted } : s.currentIssue,
    }));
    return data.data;
  },

  updateIssueStatus: (id, status) => {
    set((s) => ({
      issues: s.issues.map(i => i._id === id ? { ...i, status } : i),
      currentIssue: s.currentIssue?._id === id ? { ...s.currentIssue, status } : s.currentIssue,
    }));
  },

  addCommentToIssue: (issueId, comment) => {
    set((s) => ({
      currentIssue: s.currentIssue?._id === issueId
        ? { ...s.currentIssue, comments: [...(s.currentIssue.comments || []), comment], commentCount: (s.currentIssue.commentCount || 0) + 1 }
        : s.currentIssue,
    }));
  },
}));

// ─── Notifications Store ──────────────────────────────────────────────────────
export const useNotifStore = create((set) => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (notifs) => set({ notifications: notifs }),
  addNotification: (notif) => set((s) => ({
    notifications: [notif, ...s.notifications],
    unreadCount: s.unreadCount + 1,
  })),
  setUnreadCount: (count) => set({ unreadCount: count }),
  markAllRead: () => set({ unreadCount: 0, notifications: [] }),

  fetchNotifications: async () => {
    try {
      const { data } = await api.get('/notifications?limit=20');
      set({ notifications: data.data, unreadCount: data.unreadCount });
    } catch {}
  },
}));
