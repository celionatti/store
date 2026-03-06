/**
 * Auth API — Login User
 * Route: /api/auth/login
 */
const { connectToDatabase } = require('../_utils/db');
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('users');

    if (req.method === 'POST') {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const user = await collection.findOne({ username: username.toLowerCase().trim() });
      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const isValid = verifyPassword(password, user.salt, user.hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const token = generateSimpleToken();

      // Persist the token in the user's document
      await collection.updateOne(
        { _id: user._id },
        { $set: { activeToken: token, updatedAt: new Date() } }
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

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Auth Login Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
