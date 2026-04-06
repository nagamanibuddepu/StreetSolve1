/**
 * Authentication & Authorization Middleware
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { AppError } = require('./errorHandler');
const logger = require('../utils/logger');

// ─── Protect: require valid JWT ──────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(new AppError('Not authenticated. Please login.', 401));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user (fresh from DB to catch banned/deactivated)
    const user = await User.findById(decoded.id).select('+isActive +isBanned');
    if (!user) return next(new AppError('User no longer exists.', 401));
    if (!user.isActive) return next(new AppError('Your account has been deactivated.', 401));
    if (user.isBanned) return next(new AppError(`Account suspended: ${user.banReason || 'Violation of terms.'}`, 403));

    // Update last seen (non-blocking)
    User.findByIdAndUpdate(user._id, { lastSeen: new Date() }).exec();

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') return next(new AppError('Invalid token.', 401));
    if (err.name === 'TokenExpiredError') return next(new AppError('Token expired. Please login again.', 401));
    next(err);
  }
};

// ─── Optional Auth: attach user if token present ─────────────────────────────
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    }
  } catch (_) { /* ignore */ }
  next();
};

// ─── Role Guard ──────────────────────────────────────────────────────────────
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(new AppError('Not authenticated.', 401));
  if (!roles.includes(req.user.role)) {
    return next(new AppError(`Role '${req.user.role}' is not allowed to perform this action.`, 403));
  }
  next();
};

// ─── Generate JWT ────────────────────────────────────────────────────────────
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// ─── Send token response ─────────────────────────────────────────────────────
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);

  // Remove sensitive fields
  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.otp;
  delete userObj.passwordResetToken;

  res.status(statusCode).json({
    success: true,
    token,
    user: userObj,
  });
};

module.exports = { protect, optionalAuth, authorize, generateToken, sendTokenResponse };
