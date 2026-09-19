class ApiError extends Error {
  /**
   * @param {number} statusCode
   * @param {string} message
   * @param {any} [details]
   */
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }
  static conflict(message, details) {
    return new ApiError(409, message, details);
  }
  static internal(message = 'Internal server error', details) {
    return new ApiError(500, message, details);
  }
}

module.exports = ApiError;
