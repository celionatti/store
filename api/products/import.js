/**
 * Bulk Import API — POST CSV data
 * Route: /api/products/import
 */
const { connectToDatabase } = require('../_utils/db');
const { validateProduct } = require('../_utils/validate');
const { withAuth } = require('../_utils/auth');
const { logActivity } = require('../_utils/audit');

async function importHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { products } = req.body; // Expecting array of product objects
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'No products provided for import' });
    }

    const { db } = await connectToDatabase();
    const collection = db.collection('products');
    
    const results = {
      success: 0,
      errors: [],
    };

    for (const [index, p] of products.entries()) {
      // Basic data sanitization
      const body = {
        name: p.name || '',
        sku: p.sku || '',
        barcode: p.barcode || '',
        itemBarcodes: p.itemBarcodes || [],
        category: p.category || '',
        costPrice: parseFloat(p.costPrice) || 0,
        sellingPrice: parseFloat(p.sellingPrice) || 0,
        quantity: parseInt(p.quantity) || 0,
        reorderLevel: parseInt(p.reorderLevel) || 10,
        supplierId: p.supplierId || null,
      };

      const validationErrors = validateProduct(body);
      if (validationErrors.length > 0) {
        results.errors.push(`Row ${index + 1}: ${validationErrors.join(', ')}`);
        continue;
      }

      // Check uniqueness for import
      const existing = await collection.findOne({
        $or: [
          { sku: body.sku },
          body.barcode ? { barcode: body.barcode } : { _id: null }, // Mock filter if no barcode
        ].filter(Boolean)
      });

      if (existing) {
        results.errors.push(`Row ${index + 1}: Product with SKU ${body.sku} or Barcode already exists.`);
        continue;
      }

      await collection.insertOne({
        ...body,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      results.success++;
    }

    await logActivity(req.user, 'BULK_IMPORT', `Imported ${results.success} products via bulk import.`);

    return res.status(200).json(results);
  } catch (err) {
    console.error('Import API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = withAuth(importHandler);
