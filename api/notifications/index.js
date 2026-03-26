const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../_utils/db');
const { withAuth } = require('../_utils/auth');

async function notificationsHandler(req, res) {
  try {
    const { db } = await connectToDatabase();
    
    // Ensure TTL index for auto-deletion after 7 days (604800 seconds)
    // Runs in the background
    db.collection('notifications').createIndex({ "createdAt": 1 }, { expireAfterSeconds: 604800 }).catch(err => console.error('TTL Index Error:', err));
    
    if (req.method === 'GET') {
      const notifications = await db.collection('notifications')
        .find({ targetRole: req.user.role })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();
      
      return res.status(200).json({ notifications });
    }
    
    if (req.method === 'PUT') {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Notification ID is required' });
      }
      
      const userId = req.user.id.toString();
      await db.collection('notifications').updateOne(
        { _id: new ObjectId(id) },
        { $addToSet: { readBy: userId } }
      );
      
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Notification ID is required' });
      }
      
      await db.collection('notifications').deleteOne({ _id: new ObjectId(id) });
      return res.status(200).json({ success: true });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Notifications API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = withAuth(notificationsHandler);
