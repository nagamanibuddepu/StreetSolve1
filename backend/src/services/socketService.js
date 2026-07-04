/**
 * Socket.IO — Real-time updates with government body rooms
 */
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const initSocketHandlers = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        socket.join(`user:${decoded.id}`);
        // Join role-based rooms for push notifications
        if (['government','admin'].includes(decoded.role)) socket.join('room:government');
        if (['volunteer','ngo'].includes(decoded.role)) socket.join('room:volunteers');
      } catch (_) {}
    }
    next();
  });

  io.on('connection', (socket) => {
    logger.debug(`Socket: ${socket.id} (user:${socket.userId||'anon'} role:${socket.userRole||'-'})`);

    socket.on('join:issue', (issueId) => socket.join(`issue:${issueId}`));
    socket.on('leave:issue', (issueId) => socket.leave(`issue:${issueId}`));

    // Government body room
    socket.on('join:govbody', (govBodyId) => {
      socket.join(`govbody:${govBodyId}`);
      logger.debug(`Socket joined govbody:${govBodyId}`);
    });

    // Area-based room for nearby notifications
    socket.on('join:area', ({ lat, lng }) => {
      const areaKey = `area:${Math.round(lat*10)}_${Math.round(lng*10)}`;
      socket.join(areaKey);
    });

    socket.on('disconnect', () => logger.debug(`Socket disconnected: ${socket.id}`));
  });

  return io;
};

const emitIssueUpdate = (io, issueId, eventType, data) => {
  io.to(`issue:${issueId}`).emit(eventType, data);
  io.emit('issue:status:changed', { issueId, ...data }); // Global feed
};

const emitToUser = (io, userId, event, data) => io.to(`user:${userId}`).emit(event, data);

module.exports = { initSocketHandlers, emitIssueUpdate, emitToUser };
