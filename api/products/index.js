/**
 * Products API — GET all / POST new
 * Route: /api/products
 */
const { connectToDatabase } = require('../_utils/db');
const { validateProduct } = require('../_utils/validate');
const { withAuth } = require('../_utils/auth');
const { logActivity } = require('../_utils/audit');

async function productsHandler(req, res) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('products');

    if (req.method === 'GET') {
      const { search, category } = req.query || {};
      const filter = {};

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } },
          { barcode: { $regex: search, $options: 'i' } },
        ];
      }
      if (category) {
        filter.category = { $regex: category, $options: 'i' };
      }

      const products = await collection
        .find(filter)
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({ products });
    }

    if (req.method === 'POST') {
      const body = req.body;
      const errors = validateProduct(body);
      if (errors.length > 0) {
        return res.status(400).json({ error: errors.join(', ') });
      }

      // Check barcode uniqueness
      const existingFilter = { $or: [] };
      if (body.barcode.trim()) {
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
          return res.status(409).json({ error: 'A product with one of these barcodes/IMEIs already exists' });
        }
      }

      const product = {
        name: body.name.trim(),
        sku: body.sku.trim(),
        barcode: body.barcode ? body.barcode.trim() : '',
        itemBarcodes: Array.isArray(body.itemBarcodes) ? body.itemBarcodes.map(b => b.trim()).filter(Boolean) : [],
        category: (body.category || '').trim(),
        costPrice: parseFloat(body.costPrice) || 0,
        sellingPrice: parseFloat(body.sellingPrice) || 0,
        quantity: parseInt(body.quantity) || 0,
        reorderLevel: parseInt(body.reorderLevel) || 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await collection.insertOne(product);
      
      await logActivity(req.user, 'PRODUCT_CREATED', `Added product: ${product.name} (SKU: ${product.sku}) with ${product.quantity} units`);

      return res.status(201).json({ ...product, _id: result.insertedId });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Products API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = withAuth(productsHandler);
