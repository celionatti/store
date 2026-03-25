/**
 * Stock Alerts API — GET products below reorder level
 * Route: /api/stock/alerts
 */
const { connectToDatabase } = require('../_utils/db');
const { withAuth } = require('../_utils/auth');

async function stockAlertsHandler(req, res) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('products');

    if (req.method === 'GET') {
      // Find products where quantity <= reorderLevel
      const products = await collection
        .find({
          $expr: { $lte: ["$quantity", "$reorderLevel"] }
        })
        .sort({ quantity: 1 })
        .toArray();

      // Enrich with supplier info if possible
      const supplierIds = [...new Set(products.map(p => p.supplierId).filter(Boolean))];
      let suppliersMap = {};
      if (supplierIds.length > 0) {
        const { ObjectId } = require('mongodb');
        const suppliers = await db.collection('suppliers').find({
          _id: { $in: supplierIds.map(id => new ObjectId(id)) }
        }).toArray();
        suppliersMap = suppliers.reduce((acc, s) => {
          acc[s._id.toString()] = s.name;
          return acc;
        }, {});
      }

      const results = products.map(p => ({
        ...p,
        supplierName: p.supplierId ? (suppliersMap[p.supplierId] || 'Unknown Supplier') : 'None'
      }));

      return res.status(200).json({ alerts: results });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Stock Alerts API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = withAuth(stockAlertsHandler);
