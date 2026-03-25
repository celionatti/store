/**
 * Settings Backup API — GET all collections as JSON for backup
 * Route: /api/settings/backup
 */
const { connectToDatabase } = require('../_utils/db');
const { withAuth } = require('../_utils/auth');

async function backupHandler(req, res) {
  // Only admins can request backups
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }

  try {
    const { db } = await connectToDatabase();
    
    // Collections to backup
    const collections = ['products', 'sales', 'customers', 'suppliers', 'expenses', 'settings', 'workers', 'categories'];
    const backupData = {};

    for (const collName of collections) {
      const data = await db.collection(collName).find({}).toArray();
      backupData[collName] = data;
    }

    // Set headers for file download
    const filename = `store_backup_${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.status(200).send(JSON.stringify(backupData, null, 2));
  } catch (err) {
    console.error('Backup API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = withAuth(backupHandler);
