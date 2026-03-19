// Middleware to protect certain routes for only paying users
const requireProTier = (req, res, next) => {
  const user = req.user;
  if (!user || user.tier !== 'pro') {
    return res.status(403).json({
      error: {
        message: 'This feature is only available to Pro subscribers.',
        code: 'PRO_ONLY'
      }
    });
  }
  next();
};

module.exports = { requireProTier };
