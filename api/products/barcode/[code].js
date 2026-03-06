/**
 * Products API — Barcode lookup
 * Route: /api/products/barcode/:code
 */
const { connectToDatabase } = require('../../_utils/db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { code } = req.query;

  if (!code) {
    const rawUrl = (req.url || '').split('?')[0];
    const urlParts = rawUrl.split('/').filter(Boolean);
    code = urlParts[urlParts.length - 1];
  }

  if (!code) {
    return res.status(400).json({ error: 'Barcode code is required' });
  }

  try {
    const { db } = await connectToDatabase();
    const product = await db.collection('products').findOne({ 
      $or: [
        { barcode: code },
        { itemBarcodes: code }
      ] 
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.status(200).json(product);
  } catch (err) {
    console.error('Barcode lookup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
