/**
 * Audit Logs API (Admin Only)
 * Route: /api/audit
 */
const { connectToDatabase } = require('../_utils/db');
const { withAuth } = require('../_utils/auth');
const { logActivity } = require('../_utils/audit');

async function auditHandler(req, res) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  try {
    const { db } = await connectToDatabase();
    const logsCol = db.collection('audit_logs');

    if (req.method === 'GET') {
      // Fetch last 100 logs for now
      const logs = await logsCol
        .find({})
        .sort({ timestamp: -1 })
        .limit(100)
        .toArray();

      return res.status(200).json({ logs });
    }

    if (req.method === 'DELETE') {
      const { before } = req.query;
      if (!before) {
        return res.status(400).json({ error: 'Missing "before" date parameter' });
      }

      const beforeDate = new Date(before);
      const result = await logsCol.deleteMany({
        timestamp: { $lt: beforeDate }
      });

      await logActivity(req.user, 'AUDIT_LOGS_CLEANUP', `Deleted logs older than ${before}. Records removed: ${result.deletedCount}`);

      return res.status(200).json({ 
        message: `Successfully deleted ${result.deletedCount} old activity logs.`,
        deletedCount: result.deletedCount
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Audit API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = withAuth(auditHandler);
