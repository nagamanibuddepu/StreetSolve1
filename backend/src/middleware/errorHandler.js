const logger = require('../utils/logger');

// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle specific mongoose errors
const handleCastError = (err) => new AppError(`Invalid ${err.path}: ${err.value}`, 400);
const handleDuplicateKey = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  return new AppError(`${field} '${value}' is already registered.`, 409);
};
const handleValidationError = (err) => {
  const messages = Object.values(err.errors).map(e => e.message);
  return new AppError(messages.join('. '), 400);
};

const errorHandler = (err, req, res, next) => {
  let error = { ...err, message: err.message };
  error.statusCode = err.statusCode || 500;

  // Log error
  if (error.statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} - ${error.message}`, {
      stack: err.stack,
      body: req.body,
    });
  }

  // Transform mongoose errors
  if (err.name === 'CastError') error = handleCastError(err);
  if (err.code === 11000) error = handleDuplicateKey(err);
  if (err.name === 'ValidationError') error = handleValidationError(err);

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') error = new AppError('File too large. Max 10MB allowed.', 400);
  if (err.code === 'LIMIT_FILE_COUNT') error = new AppError('Too many files. Max 5 allowed.', 400);

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
module.exports.AppError = AppError;
