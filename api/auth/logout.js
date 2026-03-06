/**
 * Auth API — Logout User
 * Route: /api/auth/logout
 */
const { connectToDatabase } = require('../_utils/db');
const { withAuth } = require('../_utils/auth');

async function logoutHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    const usersCol = db.collection('users');

    // Revoke the token by clearing activeToken
    // req.user is populated by withAuth
    await usersCol.updateOne(
      { username: req.user.username },
      { $unset: { activeToken: "" } }
    );

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout Error:', err);
    return res.status(500).json({ error: 'Internal server error during logout' });
  }
}

module.exports = withAuth(logoutHandler);
