/**
 * Products API — GET one / PUT / DELETE
 * Route: /api/products/:id
 */
const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../_utils/db');
const { validateProduct } = require('../_utils/validate');
const { withAuth } = require('../_utils/auth');

async function productIdHandler(req, res) {
  let { id } = req.query;

  // Next.js / Vercel fallback: if dynamic route parsing fails due to rewrites, pull it from the URL
  if (!id) {
    // req.url on Vercel could be `/api/products/64abc123...` or just `/64abc123...`
    const rawUrl = (req.url || '').split('?')[0];
    const urlParts = rawUrl.split('/').filter(Boolean);
    id = urlParts[urlParts.length - 1];
  }

  if (!id || !ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('products');
    const objectId = new ObjectId(id);

    if (req.method === 'GET') {
      const product = await collection.findOne({ _id: objectId });
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      return res.status(200).json(product);
    }

    if (req.method === 'PUT') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = {}; }
      }
      body = body || {};
      
      const errors = validateProduct(body);
      if (errors.length > 0) {
        return res.status(400).json({ error: errors.join(', ') });
      }

      // Check barcode uniqueness (exclude current product)
      const existingFilter = { _id: { $ne: objectId }, $or: [] };
      if (body.barcode && body.barcode.trim()) {
        existingFilter.$or.push({ barcode: body.barcode.trim() });
        existingFilter.$or.push({ itemBarcodes: body.barcode.trim() });
      }
      if (Array.isArray(body.itemBarcodes) && body.itemBarcodes.length > 0) {
        existingFilter.$or.push({ barcode: { $in: body.itemBarcodes } });
        existingFilter.$or.push({ itemBarcodes: { $in: body.itemBarcodes } });
      }

      if (existingFilter.$or.length > 0) {
        const existing = await collection.findOne(existingFilter);
        if (existing) {
          return res.status(409).json({ error: 'Another product with one of these barcodes/IMEIs already exists' });
        }
      }

      const update = {
        $set: {
          name: body.name.trim(),
          sku: body.sku.trim(),
          barcode: body.barcode ? body.barcode.trim() : '',
          itemBarcodes: Array.isArray(body.itemBarcodes) ? body.itemBarcodes.map(b => b.trim()).filter(Boolean) : [],
          category: (body.category || '').trim(),
          costPrice: parseFloat(body.costPrice) || 0,
          sellingPrice: parseFloat(body.sellingPrice) || 0,
          quantity: parseInt(body.quantity) || 0,
          reorderLevel: parseInt(body.reorderLevel) || 10,
          updatedAt: new Date(),
        },
      };

      const result = await collection.updateOne({ _id: objectId }, update);
      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      return res.status(200).json({ message: 'Product updated' });
    }

    if (req.method === 'DELETE') {
      const result = await collection.deleteOne({ _id: objectId });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      return res.status(200).json({ message: 'Product deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Product [id] API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
module.exports = withAuth(productIdHandler);
