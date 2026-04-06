import { create } from 'zustand';

export const useIssueStore = create((set, get) => ({
  issues: [],
  filters: { status: '', category: '', sortBy: 'createdAt', search: '' },
  pagination: { page: 1, total: 0, pages: 1 },
  loading: false,

  setIssues: (issues, pagination) => set({ issues, pagination }),
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters }, pagination: { ...s.pagination, page: 1 } })),
  setPage: (page) => set((s) => ({ pagination: { ...s.pagination, page } })),
  setLoading: (v) => set({ loading: v }),
  updateIssue: (id, updates) => set((s) => ({
    issues: s.issues.map(i => i._id === id ? { ...i, ...updates } : i),
  })),
  addIssue: (issue) => set((s) => ({ issues: [issue, ...s.issues] })),
}));
