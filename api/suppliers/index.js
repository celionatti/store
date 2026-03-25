/**
 * Suppliers API — GET all / POST new
 * Route: /api/suppliers
 */
const { connectToDatabase } = require('../_utils/db');
const { validateSupplier } = require('../_utils/validate');
const { withAuth } = require('../_utils/auth');

async function suppliersHandler(req, res) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('suppliers');

    if (req.method === 'GET') {
      const { search } = req.query || {};
      const filter = {};

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
        ];
      }

      const suppliers = await collection
        .find(filter)
        .sort({ name: 1 })
        .toArray();

      return res.status(200).json({ suppliers });
    }

    if (req.method === 'POST') {
      const body = req.body;
      const errors = validateSupplier(body);
      if (errors.length > 0) {
        return res.status(400).json({ error: errors.join(', ') });
      }

      const supplier = {
        name: body.name.trim(),
        contactPerson: (body.contactPerson || '').trim(),
        email: (body.email || '').trim().toLowerCase(),
        phone: (body.phone || '').trim(),
        address: (body.address || '').trim(),
        category: (body.category || '').trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await collection.insertOne(supplier);
      return res.status(201).json({ ...supplier, _id: result.insertedId });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Suppliers API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = withAuth(suppliersHandler);
