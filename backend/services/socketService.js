/**
 * Socket.IO – Real-time notifications and issue updates
 */
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const initSocketHandlers = (io) => {
  // Authenticate socket connection
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.join(`user:${decoded.id}`);
      } catch (_) {
        // Allow unauthenticated (for public issue feeds)
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id} (user: ${socket.userId || 'anonymous'})`);

    // Join issue room for real-time updates
    socket.on('join:issue', (issueId) => {
      socket.join(`issue:${issueId}`);
    });

    socket.on('leave:issue', (issueId) => {
      socket.leave(`issue:${issueId}`);
    });

    // Join area room for nearby updates
    socket.on('join:area', ({ lat, lng, radius }) => {
      const areaKey = `area:${Math.round(lat * 100)}_${Math.round(lng * 100)}`;
      socket.join(areaKey);
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

// Emit to all users viewing a specific issue
const emitIssueUpdate = (io, issueId, eventType, data) => {
  io.to(`issue:${issueId}`).emit(eventType, data);
};

// Emit to specific user
const emitToUser = (io, userId, event, data) => {
  io.to(`user:${userId}`).emit(event, data);
};

module.exports = { initSocketHandlers, emitIssueUpdate, emitToUser };
