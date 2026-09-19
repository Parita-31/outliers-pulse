const { Server } = require('socket.io');
const env = require('./env');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST', 'PATCH'],
    },
  });

  io.on('connection', (socket) => {
    // eslint-disable-next-line no-console
    console.log(`[socket] client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      // eslint-disable-next-line no-console
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initSocket(server) first.');
  }
  return io;
}

/**
 * Emit an event to all connected clients, and never throw if sockets
 * aren't initialized yet (e.g. during seed scripts run outside the server).
 */
function emitEvent(eventName, payload) {
  try {
    if (io) {
      io.emit(eventName, payload);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[socket] failed to emit ${eventName}`, err);
  }
}

module.exports = { initSocket, getIO, emitEvent };
