/**
 * Workers API — DELETE
 * Route: /api/workers/:id
 */
const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../_utils/db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  let { id } = req.query;

  // Next.js / Vercel fallback: if dynamic route parsing fails due to rewrites, pull it from the URL
  if (!id) {
    const rawUrl = (req.url || '').split('?')[0];
    const urlParts = rawUrl.split('/').filter(Boolean);
    id = urlParts[urlParts.length - 1];
  }

  if (!id || !ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('users');
    const objectId = new ObjectId(id);

    if (req.method === 'DELETE') {
      const result = await collection.deleteOne({ _id: objectId });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.status(200).json({ message: 'Worker deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Worker [id] API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
