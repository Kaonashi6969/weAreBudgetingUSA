const xss = require('xss');
const sanitizeHtml = require('sanitize-html');

/**
 * Clean user input to prevent XSS and malformed data
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Strip HTML and filter through xss lib
  return xss(sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {}
  })).trim();
};

/**
 * Middleware to sanitize specific request parts
 */
const sanitizeMiddleware = (req, res, next) => {
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      } else if (Array.isArray(req.body[key])) {
        req.body[key] = req.body[key].map(item => {
          if (typeof item === 'string') return sanitizeInput(item);
          if (item && typeof item === 'object') {
            const sanitized = { ...item };
            for (const k in sanitized) {
              if (typeof sanitized[k] === 'string') sanitized[k] = sanitizeInput(sanitized[k]);
            }
            return sanitized;
          }
          return item;
        });
      }
    }
  }
  
  if (req.query) {
    for (let key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeInput(req.query[key]);
      }
    }
  }
  
  next();
};

module.exports = { sanitizeInput, sanitizeMiddleware };
