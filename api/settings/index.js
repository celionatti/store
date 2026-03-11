/**
 * Settings API — GET / PUT
 * Route: /api/settings
 */
const { connectToDatabase } = require('../_utils/db');
const { withAuth } = require('../_utils/auth');

async function settingsHandler(req, res) {
  try {
    const { db } = await connectToDatabase();

    if (req.method === 'GET') {
      const settings = await db.collection('settings').findOne({ type: 'global' });
      return res.status(200).json({ settings: settings || { currency: 'NGN' } });
    }

    if (req.method === 'PUT') {
      const { currency, shopName, shopSlogan, shopAddress, shopPhone } = req.body;
      
      const update = {
        currency: (currency || 'NGN').toUpperCase().trim(),
        shopName: (shopName || '').trim(),
        shopSlogan: (shopSlogan || '').trim(),
        shopAddress: (shopAddress || '').trim(),
        shopPhone: (shopPhone || '').trim(),
        updatedAt: new Date(),
      };

      await db.collection('settings').updateOne(
        { type: 'global' },
        { $set: update },
        { upsert: true }
      );

      return res.status(200).json({ message: 'Settings updated', settings: update });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Settings API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = withAuth(settingsHandler);
