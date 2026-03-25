/**
 * Auth API — Login User
 * Route: /api/auth/login
 */
const { applyCorsHeaders } = require('../_utils/cors');
const { connectToDatabase } = require('../_utils/db');
const { checkRateLimit, recordFailedAttempt, resetFailedAttempts } = require('../_utils/rateLimit');
const crypto = require('crypto');

function verifyPassword(password, salt, hash) {
  const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === checkHash;
}

// Generates a simple token for frontend session tracking
function generateSimpleToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = async function handler(req, res) {
  // CORS headers
  applyCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('users');

    if (req.method.toUpperCase() === 'POST') {
      const body = req.body || {};
      const { username, password } = body;

      const ipAddress = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';

      // 1. Check Rate Limit
      const { isBlocked, remainingTimeMs } = await checkRateLimit(ipAddress);
      if (isBlocked) {
        const remainingMinutes = Math.ceil(remainingTimeMs / (60 * 1000));
        return res.status(429).json({ 
          error: `Too many failed login attempts. Please try again in ${remainingMinutes} minute(s).` 
        });
      }

      if (!username || !password) {
        return res.status(400).json({ 
          error: 'Validation error', 
          message: 'Username and password are required' 
        });
      }

      const user = await collection.findOne({ username: username.toLowerCase().trim() });
      if (!user) {
        await recordFailedAttempt(ipAddress);
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const isValid = verifyPassword(password, user.salt, user.hash);
      if (!isValid) {
        await recordFailedAttempt(ipAddress);
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // Successful login - clear limits
      await resetFailedAttempts(ipAddress);

      const token = generateSimpleToken();

      // Persist the token in the user's document as an array to support multi-device
      await collection.updateOne(
        { _id: user._id },
        { 
          $push: { 
            activeTokens: { 
              $each: [token],
              $slice: -5 // Keep up to 5 concurrent sessions
            } 
          },
          $set: { updatedAt: new Date() } 
        }
      );

      return res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          role: user.role
        }
      });
    }


  
    return res.status(405).json({ 
      error: 'Method not allowed', 
      receivedMethod: req.method,
      expectedMethod: 'POST'
    });
  } catch (err) {
    console.error('Auth Login Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
