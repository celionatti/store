/**
 * Sales API — POST Reject Sale Cancellation Report
 * Route: /api/sales/:id/reject-report
 */
const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../../_utils/db');
const { withAuth } = require('../../_utils/auth');
const { logActivity } = require('../../_utils/audit');

async function rejectReportHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  try {
    const { db } = await connectToDatabase();
    
    // Extract ID (handling Vercel dynamic routing nuances)
    let id = req.query?.id;
    if (!id) {
       const urlParts = req.url.split('?')[0].split('/');
       // path is typically /api/sales/:id/reject-report, so :id is second to last
       id = urlParts[urlParts.length - 2];
    }

    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid sale ID' });
    }

    const saleId = new ObjectId(id);
    const sale = await db.collection('sales').findOne({ _id: saleId });

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    if (!sale.cancellationRequested) {
      return res.status(400).json({ error: 'No cancellation request pending for this sale' });
    }

    await db.collection('sales').updateOne(
      { _id: saleId },
      { 
        $unset: { 
          cancellationRequested: "",
          cancellationReason: "",
          cancellationRequestedBy: "",
          cancellationRequestedAt: ""
        } 
      }
    );

    await logActivity(req.user, 'SALE_CANCELLATION_REJECTED', `Rejected cancellation request for sale of ${sale.quantity}x ${sale.productName}`);

    return res.status(200).json({ message: 'Cancellation request rejected' });

  } catch (err) {
    console.error('Reject Report Sale API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = withAuth(rejectReportHandler);
