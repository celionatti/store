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
    const locCol = db.collection('locations');

    if (req.method === 'GET') {
      const locationId = req.user.locationId;
      const locationIdStr = (locationId && require('mongodb').ObjectId.isValid(locationId)) ? String(locationId) : null;

      // Identify if this is the DEFAULT store for legacy fallback
      const { ObjectId } = require('mongodb');
      const activeLoc = locationIdStr ? await locCol.findOne({ _id: new ObjectId(locationIdStr) }) : null;
      const isDefaultStore = activeLoc?.isDefault || false;

      const filter = {};
      if (locationIdStr) {
        if (isDefaultStore) {
          filter.$or = [
            { locationId: locationIdStr },
            { locationId: { $exists: false } },
            { locationId: null }
          ];
        } else {
          filter.locationId = locationIdStr;
        }
      }

      // Fetch last 100 logs for the current context
      const logs = await logsCol
        .find(filter)
        .sort({ timestamp: -1 })
        .limit(100)
        .toArray();

      const locations = await locCol.find({}).toArray();
      const locMap = {};
      locations.forEach(loc => {
        locMap[String(loc._id)] = loc.name;
      });

      const enrichedLogs = logs.map(log => ({
        ...log,
        storeName: log.locationId ? (locMap[log.locationId] || 'Unknown Store') : 'Default Store'
      }));

      return res.status(200).json({ logs: enrichedLogs });
    }

    if (req.method === 'DELETE') {
      const { before } = req.query;
      if (!before) {
        return res.status(400).json({ error: 'Missing "before" date parameter' });
      }

      const beforeDate = new Date(before);
      if (isNaN(beforeDate.getTime())) {
        return res.status(400).json({ error: 'Invalid "before" date format' });
      }

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
