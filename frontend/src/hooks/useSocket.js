import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useNotifStore } from '../store/notifStore';
import toast from 'react-hot-toast';

let socketInstance = null;

export const useSocket = () => {
  const { token, isAuthenticated } = useAuthStore();
  const addNotification = useNotifStore((s) => s.addNotification);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    socketInstance = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketInstance.on('connect', () => console.log('🔌 Socket connected'));
    socketInstance.on('connect_error', (e) => console.error('Socket error:', e.message));

    socketInstance.on('notification', (notif) => {
      addNotification(notif);
      toast(notif.title, { icon: '🔔', style: { background: '#0D1B3E', color: 'white', borderLeft: '4px solid #FF6B2B' } });
    });

    return () => { socketInstance?.disconnect(); socketInstance = null; };
  }, [isAuthenticated, token]);

  return socketInstance;
};

export const getSocket = () => socketInstance;
