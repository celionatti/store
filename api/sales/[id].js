/**
 * Sales API — DELETE individual sale (Refund/Cancel)
 * Route: /api/sales/:id
 */
const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../_utils/db');
const { withAuth } = require('../_utils/auth');

async function singleSaleHandler(req, res) {
  try {
    const { id } = req.query;
    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid sale ID' });
    }

    if (req.method === 'DELETE') {
      const { db } = await connectToDatabase();
      const saleId = new ObjectId(id);

      // 1. Fetch the sale to get quantity, product, and IMEI
      const sale = await db.collection('sales').findOne({ _id: saleId });
      if (!sale) {
        return res.status(404).json({ error: 'Sale not found' });
      }

      // 2. Prepare product update (refund inventory)
      const productUpdate = {
        $inc: { quantity: sale.quantity },
        $set: { updatedAt: new Date() }
      };

      if (sale.soldItemBarcode) {
        productUpdate.$push = { itemBarcodes: sale.soldItemBarcode };
      }

      // 3. Update Product
      await db.collection('products').updateOne(
        { _id: new ObjectId(sale.productId) },
        productUpdate
      );

      // 4. Delete Sale Record
      await db.collection('sales').deleteOne({ _id: saleId });

      return res.status(200).json({ message: 'Sale successfully refunded and cancelled.' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Single Sale API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = withAuth(singleSaleHandler);
