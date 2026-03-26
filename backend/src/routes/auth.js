const express = require('express');
const router = express.Router();
const passport = require('passport');
const { generateToken } = require('../middleware/auth');
const { optionalAuth } = require('../middleware/optional-auth');
const database = require('../db/database');

const jwtAuth = optionalAuth(passport.authenticate('jwt', { session: false }));

// Initiate Google Auth
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google Callback
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res) => {
    // Generate JWT token
    const token = generateToken(req.user);
    
    // Set token in an HTTP-only cookie
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: true, // Always true for SameSite=None
      sameSite: 'none', // Critical for Capacitor mobile app to store the cookie
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Handle initial login: redirect to frontend
    res.redirect(process.env.CLIENT_URL || 'http://localhost:4200');
  }
);

// Logout
router.get('/logout', (req, res) => {
  res.clearCookie('jwt');
  res.json({ message: 'Logged out successfully' });
});

// Current user profile
router.get('/me', jwtAuth, (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  res.json(req.user);
});

// Save preferred region for the current user
router.patch('/region', async (req, res) => {
  try {
    const { region } = req.body;
    if (!region || typeof region !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid region field' });
    }

    // Resolve the user from req.user (set by devAuthMiddleware in dev, or JWT in prod)
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await database.run('UPDATE users SET region = ? WHERE id = ?', [region, userId]);
    console.log(`🌍 Region updated to '${region}' for user ${userId}`);
    res.json({ success: true, region });
  } catch (err) {
    console.error('Error saving region:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
