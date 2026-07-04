import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useNotifStore } from '../store/notifStore';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

let _socket = null;

export const useSocket = () => {
  const { isAuthenticated, user } = useAuthStore();
  const addNotif = useNotifStore(s => s.addNotification);
  const queryClient = useQueryClient();
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('ss_token');
    const url   = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

    if (!_socket || !_socket.connected) {
      _socket = io(url, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      });
    }
    socketRef.current = _socket;

    _socket.on('connect', () => {
      console.log('[Socket] Connected:', _socket.id);
      // Join government body room if applicable
      if (user?.nearbyMunicipalCorp) {
        _socket.emit('join:govbody', user.nearbyMunicipalCorp);
      }
    });

    _socket.on('notification', (notif) => {
      addNotif(notif);
      
      // Fire global real-time visual push alert
      toast(notif.title || 'New Notification', {
        icon: '🔔',
        duration: 4000,
        position: 'top-center',
        style: {
          background: '#1e3a5f',
          color: '#ffffff',
          fontWeight: '600'
        }
      });
      
      if (notif.type === 'new_issue_gov') {
        console.log('[Socket] Gov notification:', notif.title);
      }
    });

    _socket.on('new:issue', () => {
      queryClient.invalidateQueries({ queryKey:['map-issues'] });
      queryClient.invalidateQueries({ queryKey:['home-issues'] });
      queryClient.invalidateQueries({ queryKey:['issues'] });
      queryClient.invalidateQueries({ queryKey:['all-issues-gov'] });
      queryClient.invalidateQueries({ queryKey:['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey:['available-issues'] });
    });

    _socket.on('issue:status:changed', () => {
      queryClient.invalidateQueries({ queryKey:['map-issues'] });
      queryClient.invalidateQueries({ queryKey:['home-issues'] });
      queryClient.invalidateQueries({ queryKey:['issues'] });
      queryClient.invalidateQueries({ queryKey:['all-issues-gov'] });
      queryClient.invalidateQueries({ queryKey:['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey:['available-issues'] });
    });

    _socket.on('disconnect', () => console.log('[Socket] Disconnected'));

    return () => {}; // Don't disconnect on unmount — keep persistent
  }, [isAuthenticated, user]);

  return socketRef.current || _socket;
};
