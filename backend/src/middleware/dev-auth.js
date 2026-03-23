/**
 * Dev Auth Middleware
 * -------------------
 * Only active when NODE_ENV=development.
 * Injects a mock user into req.user so every route behaves as if a real user
 * is logged in — without needing Google OAuth credentials.
 *
 * To switch the active test user, change DEV_MOCK_USER_EMAIL in .env.development:
 *
 *   DEV_MOCK_USER_EMAIL=tester1@example.com    → Free tier user
 *   DEV_MOCK_USER_EMAIL=protester@example.com  → Pro tier user
 *
 * Run `npm run seed` once after a fresh DB to create both test accounts.
 */

const database = require('../db/database');

const DEV_MOCK_EMAIL = process.env.DEV_MOCK_USER_EMAIL || 'tester1@example.com';

const devAuthMiddleware = async (req, res, next) => {
  try {
    const user = await database.get('SELECT * FROM users WHERE email = ?', [DEV_MOCK_EMAIL]);
    if (user) {
      req.user = user;
    } else {
      console.warn(
        `[Dev Auth] Mock user "${DEV_MOCK_EMAIL}" not found. Run "npm run seed" to create test accounts.`
      );
    }
  } catch (err) {
    console.error('[Dev Auth] Error fetching mock user:', err);
  }
  next();
};

module.exports = { devAuthMiddleware };
