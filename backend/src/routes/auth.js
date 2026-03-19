const express = require('express');
const router = express.Router();
const passport = require('passport');
const { generateToken } = require('../middleware/auth');
const database = require('../db/database');

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
      secure: process.env.NODE_ENV === 'production', 
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
router.get('/me', async (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    try {
      if (!database.db) await database.initialize();
      const mockEmail = process.env.DEV_MOCK_USER_EMAIL || 'tester1@example.com';
      const user = await database.get('SELECT * FROM users WHERE email = ?', [mockEmail]);
      if (user) {
        console.log(`🛠️ [Auth] Dev mode: Returning mock user ${mockEmail}`);
        return res.json(user);
      }
    } catch (err) {
      console.error('Auth Mock me error:', err);
    }
  }

  passport.authenticate('jwt', { session: false })(req, res, next);
}, (req, res) => {
  res.json(req.user);
});

// Save preferred region for the current user
router.patch('/region', async (req, res) => {
  try {
    const { region } = req.body;
    if (!region || typeof region !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid region field' });
    }

    // Resolve the user from JWT or dev mock
    let userId;
    if (process.env.NODE_ENV === 'development') {
      const mockEmail = process.env.DEV_MOCK_USER_EMAIL || 'tester1@example.com';
      const user = await database.get('SELECT id FROM users WHERE email = ?', [mockEmail]);
      userId = user?.id;
    } else if (req.user?.id) {
      userId = req.user.id;
    }

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
