const passport = require('passport');

/**
 * Higher-order middleware to conditionally enable authentication
 * @param {Function} middleware - The actual passport/auth middleware
 * @returns {Function} Express middleware
 */
const optionalAuth = (middleware) => (req, res, next) => {
  if (process.env.AUTH_ENABLED === 'false') {
    // If auth is disabled, let and inject a dummy user if needed
    req.user = { id: 'dev-user', tier: 'pro', display_name: 'Developer' };
    return next();
  }
  return middleware(req, res, next);
};

module.exports = { optionalAuth };
