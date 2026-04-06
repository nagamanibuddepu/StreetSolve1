import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;
  socket = io(import.meta.env.VITE_SOCKET_URL || '', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
  return socket;
};

export const disconnectSocket = () => { socket?.disconnect(); socket = null; };
export const getSocket = () => socket;

export const joinIssueRoom = (issueId) => socket?.emit('join:issue', issueId);
export const leaveIssueRoom = (issueId) => socket?.emit('leave:issue', issueId);
