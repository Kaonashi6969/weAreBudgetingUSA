const path = require('path');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
require('dotenv').config({ path: path.join(__dirname, '..', envFile) });
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { passport } = require('./middleware/auth');
const database = require('./db/database');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const { scheduler } = require('./scheduler');
const { logger } = require('./middleware/logger');
const { sanitizeMiddleware } = require('./middleware/sanitizer');
const { errorHandler, notFound } = require('./middleware/error-handler');

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_ENABLED = process.env.AUTH_ENABLED === 'true';

// Initialize database on startup
database.initialize().then(() => {
  console.log('✅ Database initialized successfully.');
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Security & Sanitization Middleware
app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(express.json());

// Dev-only Mock User Middleware (Injects tester1 by default)
if (process.env.NODE_ENV === 'development') {
  app.use(async (req, res, next) => {
    try {
      // Find the tester1 user from the seed script
      const user = await database.get('SELECT * FROM users WHERE email = ?', ['tester1@example.com']);
      if (user) {
        req.user = user;
        console.log(`🛠️ Dev mode: Mocking user ${user.email}`);
      }
    } catch (err) {
      console.error('Error fetching mock user:', err);
    }
    next();
  });
}

app.use(sanitizeMiddleware); // Clean all JSON/Query inputs

// Initialize Passport only if AUTH_ENABLED
if (AUTH_ENABLED) {
  app.use(passport.initialize());
}

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Logging
app.use(logger);

// Middleware
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:4200',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../frontend/dist/budget-frontend/browser')));

// API Routes
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);

// Apply rate limiter to API routes
app.use('/api/', limiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize scheduler if enabled
if (process.env.AUTO_SCRAPE_ENABLED === 'true') {
  const terms = (process.env.AUTO_SCRAPE_TERMS || 'csirke,tej,tojás,rizs').split(',');
  const intervalHours = parseInt(process.env.AUTO_SCRAPE_INTERVAL_HOURS) || 12;
  const intervalMs = intervalHours * 60 * 60 * 1000;
  
  console.log(`🚀 Auto-scraping enabled. Interval: ${intervalHours} hours. Terms: ${terms.join(', ')}`);
  scheduler.scheduleUniversalScraper(terms, null, intervalMs);
} else {
  console.log('ℹ️ Auto-scraping is disabled.');
}

// Serve frontend
app.get('*', (req, res) => {
  const frontendPath = path.join(__dirname, '../../frontend/dist/budget-frontend/browser/index.html');
  if (req.accepts('html')) {
    res.sendFile(frontendPath);
  } else {
    next();
  }
});

// Error Handling
app.use(notFound);
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`Cheapest Basket Backend running on http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  console.info('SIGTERM signal received.');
  console.log('Closing http server.');
  server.close(async () => {
    console.log('Http server closed.');
    scheduler.stop();
    await database.close();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  scheduler.stop();
  await database.close();
  process.exit(0);
});
