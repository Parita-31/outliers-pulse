const http = require('http');
const env = require('./src/config/env');
const app = require('./src/app');
const { initSocket } = require('./src/config/socket');
const { pool } = require('./src/config/db');

const server = http.createServer(app);
initSocket(server);

server.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] AI Incident Commander backend listening on port ${env.PORT}`);
  // eslint-disable-next-line no-console
  console.log(`[server] Environment: ${env.NODE_ENV}`);
  // eslint-disable-next-line no-console
  console.log(`[server] Health check: http://localhost:${env.PORT}/health`);
});

// -----------------------------------------------------------------------------
// Process-level safety nets — the app must never crash the process outright.
// -----------------------------------------------------------------------------
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[process] Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[process] Uncaught exception:', err);
});

function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`[server] Received ${signal}, shutting down gracefully...`);
  server.close(async () => {
    try {
      await pool.end();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[server] Error closing db pool:', err);
    }
    process.exit(0);
  });
  // Force-exit if graceful shutdown hangs
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = server;
