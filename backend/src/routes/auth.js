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

module.exports = router;
