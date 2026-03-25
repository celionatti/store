/**
 * Auth API — Register a new user
 * Route: /api/auth/register
 */
const { connectToDatabase } = require('../_utils/db');
const { applyCorsHeaders } = require('../_utils/cors');
const crypto = require('crypto');
const { logActivity } = require('../_utils/audit');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

module.exports = async function handler(req, res) {
  // CORS headers
  applyCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('users');

    if (req.method.toUpperCase() === 'POST') {
      // Robust body parsing check
      const body = req.body || {};
      const { name, username, password, role } = body;

      if (!name || !username || !password) {
        return res.status(400).json({ 
          error: 'Validation error', 
          message: 'Name, username, and password are required' 
        });
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

      // SECURITY CHECK: Restrict ANY account creation if an admin already exists
      const adminCount = await collection.countDocuments({ role: 'admin' });
      
      if (adminCount > 0) {
        // If admins exist, only an existing active admin can create another account
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return res.status(403).json({ 
            error: 'Forbidden', 
            message: 'An administrator account already exists. Only an existing administrator can create new accounts.' 
          });
        }

        const token = authHeader.split(" ")[1];
        const currentUser = await collection.findOne({ 
          $or: [
            { activeTokens: token },
            { activeToken: token }
          ],
          role: 'admin' 
        });

        if (!currentUser) {
          return res.status(403).json({ 
            error: 'Forbidden', 
            message: 'Invalid administrator token. Only an existing administrator can create new accounts.' 
          });
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
      
      // Log the registration. If req.user is available (created by another admin), use it.
      // If not (first admin setup), log as system/self.
      const actor = req.headers.authorization ? { username: user.username, id: result.insertedId } : { username: 'SYSTEM', id: 'system' };
      await logActivity(actor, 'USER_REGISTERED', `New user registered: ${user.username} (${user.role})`);
      
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

    return res.status(405).json({ 
      error: 'Method not allowed', 
      receivedMethod: req.method,
      expectedMethod: 'POST'
    });
  } catch (err) {
    console.error('Auth Register Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
