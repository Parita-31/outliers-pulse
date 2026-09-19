const env = require('../config/env');
const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = 500;
  let message = 'Internal server error';
  let details;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation error';
    details = err.errors;
  } else if (err.code === '23505') {
    // Postgres unique_violation
    statusCode = 409;
    message = 'Duplicate resource';
    details = err.detail;
  } else if (err.code === '23503') {
    // Postgres foreign_key_violation
    statusCode = 400;
    message = 'Invalid reference to related resource';
    details = err.detail;
  } else if (err.code && err.code.startsWith('23')) {
    statusCode = 400;
    message = 'Database constraint violation';
    details = err.detail;
  }

  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      details: details ?? undefined,
      stack: env.IS_PROD ? undefined : err.stack,
    },
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
}

module.exports = { errorHandler, notFoundHandler };
