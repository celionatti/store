/**
 * Sales API — DELETE individual sale (Refund/Cancel)
 * Route: /api/sales/:id
 */
const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../_utils/db');
const { withAuth } = require('../_utils/auth');
const { logActivity } = require('../_utils/audit');

async function singleSaleHandler(req, res) {
  try {
    // Attempt to get ID from query string (if parsed by Express layer) or manually from the URL path
    let id = req.query?.id;
    if (!id) {
       // Manual extraction strategy: split by '/' and get the last segment
       const urlParts = req.url.split('?')[0].split('/');
       id = urlParts[urlParts.length - 1];
    }

    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid sale ID' });
    }

    if (req.method === 'DELETE') {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }

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

      await logActivity(req.user, 'SALE_REFUNDED', `Refunded/Cancelled sale of ${sale.quantity}x ${sale.productName}${sale.soldItemBarcode ? ` (IMEI: ${sale.soldItemBarcode})` : ''}`);

      return res.status(200).json({ message: 'Sale successfully refunded and cancelled.' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Single Sale API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = withAuth(singleSaleHandler);
