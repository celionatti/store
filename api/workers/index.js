/**
 * Workers API (Admin Only) — GET all / DELETE
 * Route: /api/workers
 */
const { connectToDatabase } = require('../_utils/db');
const { ObjectId } = require('mongodb');
const { withAuth } = require('../_utils/auth');

async function workersHandler(req, res) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('users');

    // GET /api/workers - Fetch all registered employees
    if (req.method === 'GET') {
      // Fetch users ignoring secret hashes/salts
      const workers = await collection
        .find({}, { projection: { hash: 0, salt: 0 } })
        .sort({ role: 1, createdAt: -1 })
        .toArray();
        
      return res.status(200).json({ workers });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Workers API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
module.exports = withAuth(workersHandler);
