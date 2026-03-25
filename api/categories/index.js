/**
 * Categories API — GET all / POST new / DELETE
 * Route: /api/categories
 */
const { connectToDatabase } = require('../_utils/db');
const { withAuth } = require('../_utils/auth');
const { ObjectId } = require('mongodb');

async function categoriesHandler(req, res) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('categories');

    // GET /api/categories
    if (req.method === 'GET') {
      const categories = await collection.find({}).sort({ name: 1 }).toArray();
      return res.status(200).json({ categories });
    }

    // POST /api/categories
    if (req.method === 'POST') {
      const body = req.body;

      if (!body.name || !body.name.trim()) {
        return res.status(400).json({ error: 'Category name is required' });
      }

      const name = body.name.trim();

      // Check for duplicate
      const existing = await collection.findOne({
        name: { $regex: `^${name}$`, $options: 'i' },
      });
      if (existing) {
        return res.status(409).json({ error: 'A category with this name already exists' });
      }

      const category = {
        name,
        description: (body.description || '').trim(),
        createdAt: new Date(),
      };

      const result = await collection.insertOne(category);
      return res.status(201).json({ ...category, _id: result.insertedId });
    }

    // DELETE /api/categories?id=<id>
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Category ID is required' });
      }

      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }

      return res.status(200).json({ message: 'Category deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Categories API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
module.exports = withAuth(categoriesHandler);
