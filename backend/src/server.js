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
const { devAuthMiddleware } = require('./middleware/dev-auth');
const database = require('./db/database');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const { scheduler } = require('./scheduler');
const { logger } = require('./middleware/logger');
const { sanitizeMiddleware } = require('./middleware/sanitizer');
const { errorHandler, notFound } = require('./middleware/error-handler');
const { seed: seedRecipes } = require('../seed-recipes');
const { ALL_STORES } = require('./config/regions');

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_ENABLED = process.env.AUTH_ENABLED === 'true';

// Initialize database on startup, then seed stores & recipes
database.initialize().then(async () => {
  console.log('✅ Database initialized successfully.');

  // Sync region-config stores into the DB so JOINs work
  for (const store of ALL_STORES) {
    const region = store.regions?.[0] || 'us';
    await database.run(
      `INSERT INTO stores (id, name, region) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, region = excluded.region`,
      [store.id, store.name, region],
    );
  }
  console.log(`✅ ${ALL_STORES.length} stores synced to database.`);

  try {
    await seedRecipes();
  } catch (err) {
    console.warn('⚠️ Recipe seeding failed:', err.message);
  }
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Security & Sanitization Middleware
app.use(helmet());
app.use(compression());
app.use(cookieParser());
app.use(express.json());

app.use(sanitizeMiddleware); // Clean all JSON/Query inputs

// Inject mock user in dev so all routes behave as authenticated without real OAuth
if (process.env.NODE_ENV === 'development') {
  app.use(devAuthMiddleware);
}

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
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:4200',
  'capacitor://localhost',
  'http://localhost',
  'http://localhost:3000',
  'http://10.0.2.2:3000',
  'http://169.254.83.107:3000',
  'http://169.254.83.107',
  'http://169.254.83.107:4200' // Added for Live Reload on Android Emulator
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('capacitor://') || origin.startsWith('http://localhost') || origin.startsWith('http://169.254.83.107')) {
      callback(null, true);
    } else {
      console.error(`CORS blocked for origin: ${origin}`);
      callback(null, true); // Temporarily allow all in dev to debug connectivity
    }
  },
  credentials: true,
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
