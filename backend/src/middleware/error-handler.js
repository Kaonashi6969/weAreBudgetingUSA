function errorHandler(err, req, res, next) {
  console.error(err.stack);

  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: {
      message,
      status,
      // Only include stack trace in development
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }
  });
}

function notFound(req, res, next) {
  res.status(404).json({
    error: {
      message: `Not Found - ${req.originalUrl}`,
      status: 404
    }
  });
}

module.exports = { errorHandler, notFound };
