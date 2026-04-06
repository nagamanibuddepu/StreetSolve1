import { create } from 'zustand';

export const useNotifStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (n, count) => set({ notifications: n, unreadCount: count }),
  addNotification: (n) => set((s) => ({ notifications: [n, ...s.notifications], unreadCount: s.unreadCount + 1 })),
  markRead: () => set({ unreadCount: 0 }),
}));
