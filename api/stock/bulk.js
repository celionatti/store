/**
 * Stock API — Bulk Stock Entry
 * Route: POST /api/stock/bulk
 *
 * Accepts an array of stock entries and processes them in batch.
 * Each entry adds quantity to the matching product.
 */
const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../_utils/db');
const { withAuth } = require('../_utils/auth');
const { logActivity } = require('../_utils/audit');

async function bulkStockHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { entries, supplier, totalCost } = req.body || {};

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'entries array is required' });
    }

    const { db } = await connectToDatabase();
    const productsCol = db.collection('products');
    const stockCol = db.collection('stock_entries');

    // Group entries by productId to aggregate quantities
    const grouped = {};
    for (const entry of entries) {
      if (!entry.productId) continue;
      const pid = entry.productId;
      if (!grouped[pid]) {
        grouped[pid] = {
          productId: pid,
          productName: entry.productName || '',
          quantity: 0,
          imeis: [],
          newCostPrice: entry.newCostPrice,
          newSellingPrice: entry.newSellingPrice
        };
      }
      grouped[pid].quantity += entry.quantity || 1;
      if (entry.imei) {
        grouped[pid].imeis.push(entry.imei);
      }
      // If later entries in the same group provide price overrides, take them
      if (entry.newCostPrice !== undefined) grouped[pid].newCostPrice = entry.newCostPrice;
      if (entry.newSellingPrice !== undefined) grouped[pid].newSellingPrice = entry.newSellingPrice;
    }

    const results = [];
    const now = new Date();

    for (const pid of Object.keys(grouped)) {
      const g = grouped[pid];

      // Create stock entry record
        productId: pid,
        productName: g.productName,
        quantity: g.quantity,
        locationId: req.user.locationId,
        supplier: (supplier || '').trim(),
        totalCost: parseFloat(totalCost) || 0,
        imeis: g.imeis,
        isBulk: true,
        createdAt: now,
      };

      await stockCol.insertOne(stockEntry);

      const locationIdStr = String(stockEntry.locationId);
      const product = await productsCol.findOne({ _id: new ObjectId(pid) });
      const currentStock = product?.locationStock || [];
      const hasLocation = currentStock.some(s => String(s.locationId) === locationIdStr);

      // Increment product quantity and update prices if necessary
      const updateData = { updatedAt: now };
      
      if (g.newCostPrice !== undefined && g.newCostPrice !== '') {
        const costParsed = parseFloat(g.newCostPrice);
        if (!isNaN(costParsed)) updateData.costPrice = costParsed;
      }
      if (g.newSellingPrice !== undefined && g.newSellingPrice !== '') {
        const sellParsed = parseFloat(g.newSellingPrice);
        if (!isNaN(sellParsed)) updateData.sellingPrice = sellParsed;
      }

      const updateOps = {
        $set: updateData,
      };

      if (!hasLocation) {
        updateOps.$push = {
          locationStock: {
            locationId: locationIdStr,
            quantity: g.quantity,
            itemBarcodes: g.imeis
          }
        };
        await productsCol.updateOne({ _id: new ObjectId(pid) }, updateOps);
      } else {
        updateOps.$inc = { 'locationStock.$[elem].quantity': g.quantity };
        if (g.imeis.length > 0) {
          updateOps.$addToSet = { 'locationStock.$[elem].itemBarcodes': { $each: g.imeis } };
        }
        await productsCol.updateOne(
          { _id: new ObjectId(pid) },
          updateOps,
          { arrayFilters: [{ 'elem.locationId': locationIdStr }] }
        );
      }

      results.push({
        productId: pid,
        productName: g.productName,
        quantityAdded: g.quantity,
        imeisAdded: g.imeis.length,
      });
    }

    await logActivity(
      req.user,
      'BULK_STOCK_ENTRY',
      `Bulk stock entry: ${entries.length} items across ${Object.keys(grouped).length} products`
    );

    return res.status(201).json({
      message: `Successfully processed ${entries.length} items across ${Object.keys(grouped).length} products`,
      results,
    });
  } catch (err) {
    console.error('Bulk stock error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = withAuth(bulkStockHandler);
