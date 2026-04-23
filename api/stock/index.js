/**
 * Stock Entries API — POST new / GET all
 * Route: /api/stock
 */
const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../_utils/db');
const { validateStockEntry } = require('../_utils/validate');
const { withAuth } = require('../_utils/auth');

async function stockHandler(req, res) {
  try {
    const { db } = await connectToDatabase();

    if (req.method === 'GET') {
      const locationId = req.user.locationId;
      const locationIdStr = (locationId && require('mongodb').ObjectId.isValid(locationId)) ? String(locationId) : null;

      // Identify if this is the DEFAULT store for legacy fallback
      const { ObjectId } = require('mongodb');
      const activeLoc = locationIdStr ? await db.collection('locations').findOne({ _id: new ObjectId(locationIdStr) }) : null;
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

      const entries = await db.collection('stock_entries')
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();

      return res.status(200).json({ entries });
    }

    if (req.method === 'POST') {
      const body = req.body;
      const errors = validateStockEntry(body);
      if (errors.length > 0) {
        return res.status(400).json({ error: errors.join(', ') });
      }

      const entry = {
        productId: body.productId,
        productName: body.productName || '',
        quantity: parseInt(body.quantity),
        locationId: req.user.locationId,
        supplier: (body.supplier || '').trim(),
        totalCost: parseFloat(body.totalCost) || 0,
        imeis: Array.isArray(body.itemBarcodes) ? body.itemBarcodes : [],
        createdAt: new Date(),
      };

      // Insert stock entry
      await db.collection('stock_entries').insertOne(entry);

      // Extract price overrides
      const updateData = { updatedAt: new Date() };
      if (body.newCostPrice !== undefined && body.newCostPrice !== '') {
        const costParsed = parseFloat(body.newCostPrice);
        if (!isNaN(costParsed)) updateData.costPrice = costParsed;
      }
      if (body.newSellingPrice !== undefined && body.newSellingPrice !== '') {
        const sellParsed = parseFloat(body.newSellingPrice);
        if (!isNaN(sellParsed)) updateData.sellingPrice = sellParsed;
      }

      // Update product quantity and prices
      // We first ensure the location entry exists in the product document
      const locationIdStr = String(entry.locationId);
      
      const product = await db.collection('products').findOne({ _id: new ObjectId(body.productId) });
      const currentStock = product?.locationStock || [];
      const hasLocation = currentStock.some(s => String(s.locationId) === locationIdStr);

      if (!hasLocation) {
        // First entry for this location: push it
        await db.collection('products').updateOne(
          { _id: new ObjectId(body.productId) },
          {
            $set: updateData,
            $push: {
              locationStock: {
                locationId: locationIdStr,
                quantity: entry.quantity,
                itemBarcodes: entry.imeis
              }
            }
          }
        );
      } else {
        // Existing location: update specific element
        const incData = { 'locationStock.$[elem].quantity': entry.quantity };
        const positionalUpdate = {
          $inc: incData,
          $set: updateData
        };

        if (entry.imeis.length > 0) {
          positionalUpdate.$addToSet = { 'locationStock.$[elem].itemBarcodes': { $each: entry.imeis } };
        }

        await db.collection('products').updateOne(
          { _id: new ObjectId(body.productId) },
          positionalUpdate,
          { arrayFilters: [{ 'elem.locationId': locationIdStr }] }
        );
      }

      return res.status(201).json({ message: 'Stock entry recorded', entry });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Stock API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
module.exports = withAuth(stockHandler);
