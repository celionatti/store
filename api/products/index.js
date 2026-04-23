/**
 * Products API — GET all / POST new
 * Route: /api/products
 */
const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../_utils/db');
const { validateProduct } = require('../_utils/validate');
const { withAuth } = require('../_utils/auth');
const { logActivity } = require('../_utils/audit');
const { mapProductForLocation } = require('../_utils/stock');

async function productsHandler(req, res) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('products');
    const locCol = db.collection('locations');

    if (req.method === 'GET') {
      const { search, category, type } = req.query || {};
      const locationId = req.user.locationId;
      const locationIdStr = locationId ? String(locationId) : null;
      const isAdmin = ['admin', 'manager'].includes(req.user.role);

      // Identify if this is the DEFAULT store for legacy fallback
      const activeLoc = (locationIdStr && ObjectId.isValid(locationIdStr)) ? await locCol.findOne({ _id: new ObjectId(locationIdStr) }) : null;
      const isDefaultStore = activeLoc?.isDefault || false;

      // 1. Core Isolation Filter
      const isolationFilter = {
        $or: [
          { "locationStock.locationId": locationIdStr },
          { "locationStock.locationId": (locationIdStr && ObjectId.isValid(locationIdStr)) ? new ObjectId(locationIdStr) : null },
          ...(isDefaultStore ? [{ $or: [{ locationStock: { $exists: false } }, { locationStock: { $size: 0 } }] }] : [])
        ].filter(f => f["locationStock.locationId"] !== null || Object.keys(f).includes('$or'))
      };

      const filter = { $and: [isolationFilter] };

      if (search) {
        filter.$and.push({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { sku: { $regex: search, $options: 'i' } },
            { barcode: { $regex: search, $options: 'i' } },
            { "locationStock.itemBarcodes": { $regex: search, $options: 'i' } },
            ...(isDefaultStore ? [{ itemBarcodes: { $regex: search, $options: 'i' } }] : [])
          ]
        });
      }

      if (category) {
        filter.$and.push({ category: { $regex: category, $options: 'i' } });
      }

      // If low-stock is requested, we need to compare local quantity
      // Since localized quantity is nested, we use an aggregation fallback or 
      // just fetch and filter in JS for now (simpler for 100s of products)
      // For scalability, we'd use an aggregate $match on effectiveQty like in dashboard.
      
      let products = [];
      if (type === 'low-stock') {
        // Use aggregate to find products below reorder level in THIS location
        products = await collection.aggregate([
          { $match: filter },
          {
            $addFields: {
              matchedStock: {
                $filter: {
                  input: { $ifNull: ["$locationStock", []] },
                  as: "s",
                  cond: { $eq: ["$$s.locationId", locationIdStr] }
                }
              }
            }
          },
          {
            $addFields: {
              currentQty: {
                $cond: {
                  if: { $gt: [{ $size: "$matchedStock" }, 0] },
                  then: { $arrayElemAt: ["$matchedStock.quantity", 0] },
                  else: {
                    $cond: {
                      if: { $and: [isDefaultStore, { $or: [{ $not: ["$locationStock"] }, { $eq: [{ $size: { $ifNull: ["$locationStock", []] } }, 0] }] }] },
                      then: { $ifNull: ["$quantity", 0] },
                      else: 0
                    }
                  }
                }
              }
            }
          },
          { $match: { $expr: { $lte: ["$currentQty", "$reorderLevel"] } } },
          { $sort: { createdAt: -1 } }
        ]).toArray();
      } else {
        products = await collection
          .find(filter)
          .sort({ createdAt: -1 })
          .toArray();
      }

      const mappedProducts = products.map(p => mapProductForLocation(p, locationId, isAdmin));
      return res.status(200).json({ products: mappedProducts });
    }

    if (req.method === 'POST') {
      const body = req.body;
      const errors = validateProduct(body);
      if (errors.length > 0) {
        return res.status(400).json({ error: errors.join(', ') });
      }

      // Check barcode uniqueness
      const existingFilter = { $or: [] };
      if (body.barcode.trim()) {
        existingFilter.$or.push({ barcode: body.barcode.trim() });
        existingFilter.$or.push({ "locationStock.itemBarcodes": body.barcode.trim() });
        existingFilter.$or.push({ itemBarcodes: body.barcode.trim() });
      }
      if (Array.isArray(body.itemBarcodes) && body.itemBarcodes.length > 0) {
        existingFilter.$or.push({ barcode: { $in: body.itemBarcodes } });
        existingFilter.$or.push({ "locationStock.itemBarcodes": { $in: body.itemBarcodes } });
        existingFilter.$or.push({ itemBarcodes: { $in: body.itemBarcodes } });
      }

      if (existingFilter.$or.length > 0) {
        const existing = await collection.findOne(existingFilter);
        if (existing) {
          return res.status(409).json({ error: 'A product with one of these barcodes/IMEIs already exists in the system' });
        }
      }

      const locationId = req.user.locationId;
      const product = {
        name: body.name.trim(),
        sku: body.sku.trim(),
        barcode: body.barcode ? body.barcode.trim() : '',
        category: (body.category || '').trim(),
        costPrice: parseFloat(body.costPrice) || 0,
        sellingPrice: parseFloat(body.sellingPrice) || 0,
        reorderLevel: parseInt(body.reorderLevel) || 10,
        supplierId: body.supplierId || null,
        locationStock: [
          {
            locationId: String(locationId),
            quantity: parseInt(body.quantity) || 0,
            itemBarcodes: Array.isArray(body.itemBarcodes) ? body.itemBarcodes.map(b => b.trim()).filter(Boolean) : [],
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await collection.insertOne(product);
      await logActivity(req.user, 'PRODUCT_CREATED', `Added product: ${product.name} at location ${locationId}`);

      return res.status(201).json({ ...product, _id: result.insertedId });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Products API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = withAuth(productsHandler);
