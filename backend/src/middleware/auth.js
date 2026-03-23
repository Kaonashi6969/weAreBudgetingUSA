const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const jwt = require('jsonwebtoken');
const database = require('../db/database');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_only';

// In production, credentials must be set — bail out early rather than crash silently later.
if (process.env.AUTH_ENABLED === 'true') {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('FATAL: AUTH_ENABLED=true but GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set.');
    process.exit(1);
  }
  if (!process.env.JWT_SECRET) {
    console.error('FATAL: AUTH_ENABLED=true but JWT_SECRET is not set.');
    process.exit(1);
  }
}

passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID || 'dummy_id_for_dev',
    clientSecret: GOOGLE_CLIENT_SECRET || 'dummy_secret_for_dev',
    callbackURL: "/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Logic to find or create user in DB
      let user = await database.get('SELECT * FROM users WHERE google_id = ?', [profile.id]);
      
      if (!user) {
        const id = profile.id; // Using google id as internal id for simplicity here
        const email = profile.emails[0].value;
        const displayName = profile.displayName;
        const profilePic = profile.photos[0]?.value;

        await database.run(
          'INSERT INTO users (id, google_id, email, display_name, profile_pic) VALUES (?, ?, ?, ?, ?)',
          [id, id, email, displayName, profilePic]
        );
        user = await database.get('SELECT * FROM users WHERE id = ?', [id]);
      }
      
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }
));

// JWT Strategy for protecting routes
const opts = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    (req) => req.cookies?.jwt || null, // Extract from cookie
    ExtractJwt.fromAuthHeaderAsBearerToken() // Or from header
  ]),
  secretOrKey: JWT_SECRET
};

passport.use(new JwtStrategy(opts, async (jwt_payload, done) => {
  try {
    const user = await database.get('SELECT * FROM users WHERE id = ?', [jwt_payload.id]);
    if (user) {
      return done(null, user);
    }
    return done(null, false);
  } catch (err) {
    return done(err, false);
  }
}));

const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email, tier: user.tier }, JWT_SECRET, {
    expiresIn: '7d'
  });
};

module.exports = { passport, generateToken };
