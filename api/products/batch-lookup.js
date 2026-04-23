/**
 * Products API — Batch Barcode/IMEI Lookup
 * Route: POST /api/products/batch-lookup
 *
 * Accepts an array of barcode/IMEI codes and returns matched products
 * along with unmatched codes flagged separately.
 */
const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../_utils/db');
const { withAuth } = require('../_utils/auth');
const { mapProductForLocation } = require('../_utils/stock');

async function batchLookupHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { codes } = req.body || {};

    if (!Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({ error: 'codes array is required' });
    }

    // Cap at 500 to prevent abuse
    if (codes.length > 500) {
      return res.status(400).json({ error: 'Maximum 500 codes per request' });
    }

    // Clean and deduplicate
    const cleanCodes = [...new Set(codes.map(c => String(c).trim()).filter(Boolean))];

    const { db } = await connectToDatabase();
    const collection = db.collection('products');
    const locCol = db.collection('locations');

    const locationId = req.user.locationId;
    const locationIdStr = locationId ? String(locationId) : null;
    const isAdmin = req.user.role === 'admin';

    // Identify if this is the DEFAULT store for legacy fallback
    const activeLoc = locationIdStr ? await locCol.findOne({ _id: new ObjectId(locationIdStr) }) : null;
    const isDefaultStore = activeLoc?.isDefault || false;

    /**
     * SEARCH LOGIC:
     * 1. Search by global 'barcode' (SKU) -> Should always match so we can add stock or sell.
     * 2. Search by local 'locationStock.itemBarcodes' -> Match only if in THIS store.
     * 3. Search by legacy 'itemBarcodes' -> Match only if isDefaultStore.
     */
    const matchedProducts = await collection.find({
      $or: [
        { barcode: { $in: cleanCodes } },
        { "locationStock": { 
            $elemMatch: { 
              locationId: locationIdStr, 
              itemBarcodes: { $in: cleanCodes } 
            } 
          } 
        },
        ...(isDefaultStore ? [{ itemBarcodes: { $in: cleanCodes } }] : [])
      ]
    }).toArray();

    // Build a lookup map: code -> product
    const codeToProduct = {};
    for (const product of matchedProducts) {
      // Check general barcode (always)
      if (product.barcode && cleanCodes.includes(product.barcode)) {
        codeToProduct[product.barcode] = product;
      }
      
      // Check localized IMEIs
      const localStock = product.locationStock?.find(s => s.locationId === locationIdStr);
      if (localStock?.itemBarcodes) {
        for (const imei of localStock.itemBarcodes) {
          if (cleanCodes.includes(imei)) {
            codeToProduct[imei] = product;
          }
        }
      }

      // Check legacy IMEIs (only for default store)
      if (isDefaultStore && Array.isArray(product.itemBarcodes)) {
        for (const imei of product.itemBarcodes) {
          if (cleanCodes.includes(imei)) {
            codeToProduct[imei] = product;
          }
        }
      }
    }

    // Build results array preserving input order
    const results = cleanCodes.map(code => {
      const product = codeToProduct[code] || null;
      const mapped = product ? mapProductForLocation(product, locationIdStr, isAdmin) : null;

      return {
        code,
        matched: !!mapped,
        product: mapped ? {
          _id: mapped._id,
          name: mapped.name,
          sku: mapped.sku,
          barcode: mapped.barcode,
          category: mapped.category || '',
          costPrice: mapped.costPrice,
          sellingPrice: mapped.sellingPrice,
          quantity: mapped.quantity,
          reorderLevel: mapped.reorderLevel,
          totalQuantity: mapped.totalQuantity,
        } : null,
      };
    });

    // Sort: matched first (grouped by product name), unmatched at bottom
    results.sort((a, b) => {
      if (a.matched && !b.matched) return -1;
      if (!a.matched && b.matched) return 1;
      if (a.matched && b.matched) {
        const nameA = (a.product?.name || '').toLowerCase();
        const nameB = (b.product?.name || '').toLowerCase();
        if (nameA !== nameB) return nameA.localeCompare(nameB);
      }
      return 0;
    });

    const matchedCount = results.filter(r => r.matched).length;
    const unmatchedCount = results.filter(r => !r.matched).length;

    return res.status(200).json({
      results,
      summary: {
        total: results.length,
        matched: matchedCount,
        unmatched: unmatchedCount,
      }
    });
  } catch (err) {
    console.error('Batch lookup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = withAuth(batchLookupHandler);
