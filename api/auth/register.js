/**
 * Auth API — Register a new user
 * Route: /api/auth/register
 */
const { connectToDatabase } = require('../_utils/db');
const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { salt, hash };
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
      const { name, username, password, role } = req.body;

      if (!name || !username || !password) {
        return res.status(400).json({ error: 'Name, username, and password are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }

      // Check if username already exists
      const existingUser = await collection.findOne({ username: username.toLowerCase() });
      if (existingUser) {
        return res.status(409).json({ error: 'Username already taken' });
      }

      // Assign role (default to worker unless explicitly admin)
      let assignedRole = role === 'admin' ? 'admin' : 'worker';

      // SECURITY CHECK: Restrict admin creation
      if (assignedRole === 'admin') {
        const adminCount = await collection.countDocuments({ role: 'admin' });
        
        if (adminCount > 0) {
          // If admins exist, only an existing active admin can create another one
          const authHeader = req.headers.authorization;
          if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(403).json({ error: 'Forbidden: Only existing admins can create another admin account' });
          }

          const token = authHeader.split(" ")[1];
          const currentUser = await collection.findOne({ activeToken: token, role: 'admin' });

          if (!currentUser) {
            return res.status(403).json({ error: 'Forbidden: Only existing admins can create another admin account' });
          }
        }
      }

      const { salt, hash } = hashPassword(password);

      const user = {
        name: name.trim(),
        username: username.toLowerCase().trim(),
        salt,
        hash,
        role: assignedRole,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await collection.insertOne(user);
      
      return res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: result.insertedId,
          name: user.name,
          username: user.username,
          role: user.role
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Auth Register Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
