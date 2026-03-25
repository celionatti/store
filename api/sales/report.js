/**
 * Sales API — POST Report Sale for Cancellation
 * Route: /api/sales/report
 */
const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../_utils/db');
const { withAuth } = require('../_utils/auth');
const { logActivity } = require('../_utils/audit');

async function reportSaleHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    
    const { id, reason } = req.body || {};

    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid sale ID' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Please provide a reason for cancellation' });
    }

    const saleId = new ObjectId(id);
    const sale = await db.collection('sales').findOne({ _id: saleId });

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    if (sale.cancellationRequested) {
      return res.status(400).json({ error: 'Cancellation already requested for this sale' });
    }

    await db.collection('sales').updateOne(
      { _id: saleId },
      { 
        $set: { 
          cancellationRequested: true,
          cancellationReason: reason.trim(),
          cancellationRequestedBy: req.user.username,
          cancellationRequestedAt: new Date()
        } 
      }
    );

    await logActivity(req.user, 'SALE_CANCELLATION_REQUESTED', `Requested cancellation for sale of ${sale.quantity}x ${sale.productName}. Reason: ${reason}`);

    return res.status(200).json({ message: 'Cancellation request submitted successfully' });

  } catch (err) {
    console.error('Report Sale API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = withAuth(reportSaleHandler);
