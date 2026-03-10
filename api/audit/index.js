/**
 * Audit Logs API (Admin Only)
 * Route: /api/audit
 */
const { connectToDatabase } = require('../_utils/db');
const { withAuth } = require('../_utils/auth');

async function auditHandler(req, res) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    const logsCol = db.collection('audit_logs');

    // Fetch last 100 logs for now
    const logs = await logsCol
      .find({})
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();

    return res.status(200).json({ logs });
  } catch (err) {
    console.error('Audit API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = withAuth(auditHandler);
