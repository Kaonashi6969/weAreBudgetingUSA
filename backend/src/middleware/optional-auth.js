const passport = require('passport');

/**
 * Wraps a passport middleware so it is skipped when AUTH_ENABLED=false.
 * In dev, req.user is already populated by devAuthMiddleware — just pass through.
 * In prod, delegates to the real passport strategy.
 */
const optionalAuth = (middleware) => (req, res, next) => {
  if (process.env.AUTH_ENABLED !== 'true') {
    // devAuthMiddleware already set req.user from the seeded mock account
    return next();
  }
  return middleware(req, res, next);
};

module.exports = { optionalAuth };
