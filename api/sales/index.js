/**
 * Sales API — POST new / GET all
 * Route: /api/sales
 */
const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../_utils/db');
const { validateSale } = require('../_utils/validate');
const { withAuth } = require('../_utils/auth');

async function salesHandler(req, res) {
  try {
    const { db } = await connectToDatabase();

    if (req.method === 'GET') {
      const { from, to } = req.query || {};
      const filter = {};

      if (from || to) {
        filter.createdAt = {};
        if (from) filter.createdAt.$gte = new Date(from);
        if (to) {
          const toDate = new Date(to);
          toDate.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = toDate;
        }
      }

      const sales = await db.collection('sales')
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(200)
        .toArray();

      return res.status(200).json({ sales });
    }

    if (req.method === 'POST') {
      const body = req.body;
      const errors = validateSale(body);
      if (errors.length > 0) {
        return res.status(400).json({ error: errors.join(', ') });
      }

      const sale = {
        productId: body.productId,
        productName: body.productName || '',
        quantity: parseInt(body.quantity),
        soldItemBarcode: body.soldItemBarcode ? body.soldItemBarcode.trim() : null,
        unitPrice: parseFloat(body.unitPrice) || 0,
        costPrice: parseFloat(body.costPrice) || 0,
        totalAmount: parseFloat(body.totalAmount) || 0,
        profit: parseFloat(body.profit) || 0,
        createdAt: new Date(),
      };

      // Insert sale
      await db.collection('sales').insertOne(sale);

      const productUpdate = {
        $inc: { quantity: -sale.quantity },
        $set: { updatedAt: new Date() },
      };

      if (sale.soldItemBarcode) {
        productUpdate.$pull = { itemBarcodes: sale.soldItemBarcode };
      }

      // Decrement product quantity and optionally remove specific IMEI
      await db.collection('products').updateOne(
        { _id: new ObjectId(body.productId) },
        productUpdate
      );

      return res.status(201).json({ message: 'Sale recorded', sale });
    }

    if (req.method === 'DELETE') {
      const { before } = req.query;
      if (!before) {
        return res.status(400).json({ error: 'Missing before date parameter for bulk deletion.' });
      }

      const beforeDate = new Date(before);
      const result = await db.collection('sales').deleteMany({
        createdAt: { $lt: beforeDate }
      });

      return res.status(200).json({ 
        message: `Successfully deleted ${result.deletedCount} old sales entries.` 
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Sales API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
module.exports = withAuth(salesHandler);
