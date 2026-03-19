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
        req.body[key] = req.body[key].map(item => typeof item === 'string' ? sanitizeInput(item) : item);
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
