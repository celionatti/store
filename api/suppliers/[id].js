/**
 * Suppliers API — GET / PUT / DELETE single
 * Route: /api/suppliers/[id]
 */
const { connectToDatabase } = require('../_utils/db');
const { validateSupplier } = require('../_utils/validate');
const { withAuth } = require('../_utils/auth');
const { ObjectId } = require('mongodb');

async function supplierIdHandler(req, res) {
  try {
    let { id } = req.query;
    if (!id) {
      const rawUrl = (req.url || '').split('?')[0];
      const urlParts = rawUrl.split('/').filter(Boolean);
      id = urlParts[urlParts.length - 1];
    }

    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid or missing supplier ID' });
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('suppliers');

    if (req.method === 'GET') {
      const supplier = await collection.findOne({ _id: new ObjectId(id) });
      if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
      return res.status(200).json(supplier);
    }

    if (req.method === 'PUT') {
      const body = req.body;
      const errors = validateSupplier(body);
      if (errors.length > 0) {
        return res.status(400).json({ error: errors.join(', ') });
      }

      const update = {
        name: body.name.trim(),
        contactPerson: (body.contactPerson || '').trim(),
        email: (body.email || '').trim().toLowerCase(),
        phone: (body.phone || '').trim(),
        address: (body.address || '').trim(),
        category: (body.category || '').trim(),
        updatedAt: new Date(),
      };

      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: update }
      );

      if (result.matchedCount === 0) return res.status(404).json({ error: 'Supplier not found' });
      return res.status(200).json({ ...update, _id: id });
    }

    if (req.method === 'DELETE') {
      // Check if products are linked to this supplier
      const productCount = await db.collection('products').countDocuments({ supplierId: id });
      if (productCount > 0) {
        return res.status(409).json({ error: `Cannot delete supplier: ${productCount} products are still linked to it.` });
      }

      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) return res.status(404).json({ error: 'Supplier not found' });
      return res.status(200).json({ message: 'Supplier deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Supplier ID API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = withAuth(supplierIdHandler);
