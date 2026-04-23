/**
 * Sales API — POST new / GET all
 * Route: /api/sales
 */
const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../_utils/db');
const { validateSale, validateCartSale, isValidObjectId } = require('../_utils/validate');
const { withAuth } = require('../_utils/auth');
const { logActivity } = require('../_utils/audit');

async function salesHandler(req, res) {
  try {
    const { db } = await connectToDatabase();

    if (req.method === 'GET') {
      const { from, to } = req.query || {};
      const filter = {};

      if (from || to) {
        filter.createdAt = {};
        if (from) {
          const fromDate = new Date(from);
          if (isNaN(fromDate.getTime())) return res.status(400).json({ error: 'Invalid "from" date format' });
          filter.createdAt.$gte = fromDate;
        }
        if (to) {
          const toDate = new Date(to);
          if (isNaN(toDate.getTime())) return res.status(400).json({ error: 'Invalid "to" date format' });
          toDate.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = toDate;
        }
      }

      const locationId = req.user.locationId;
      const locationIdStr = (locationId && ObjectId.isValid(locationId)) ? String(locationId) : null;

      // Identify if this is the DEFAULT store for legacy fallback
      const activeLoc = locationIdStr ? await db.collection('locations').findOne({ _id: new ObjectId(locationIdStr) }) : null;
      const isDefaultStore = activeLoc?.isDefault || false;

      // Filter: If default store, include legacy (missing locationId)
      if (locationIdStr) {
        const locIdObj = new ObjectId(locationIdStr);
        const locationIds = [locationIdStr, locIdObj];
        if (isDefaultStore) {
          filter.$or = [
            { locationId: { $in: locationIds } },
            { locationId: { $exists: false } },
            { locationId: null }
          ];
        } else {
          filter.locationId = { $in: locationIds };
        }
      }

      const sales = await db.collection('sales')
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(200)
        .toArray();

      return res.status(200).json({ sales });
    }

    if (req.method === 'POST') {
      const body = req.body;

      // Support both legacy single-item and new multi-item cart
      const items = body.items || [body];
      const isCart = Array.isArray(body.items);

      if (isCart) {
        const errors = validateCartSale(body);
        if (errors.length > 0) {
          return res.status(400).json({ error: errors.join(', ') });
        }
      } else {
        const errors = validateSale(body);
        if (errors.length > 0) {
          return res.status(400).json({ error: errors.join(', ') });
        }
      }

      const transactionId = new ObjectId().toString();
      const now = new Date();
      const saleRecords = [];
      const customerId = body.customerId;
      const customerName = body.customerName;

      // Fetch settings for tax calculation
      const settings = await db.collection('settings').findOne({ type: 'global' });
      const taxRate = settings?.taxRate || 0;

      let totalTransactionAmount = 0;

      for (const item of items) {
        const itemTotal = parseFloat(item.totalAmount) || (parseFloat(item.unitPrice) * parseInt(item.quantity));
        const taxAmount = (itemTotal * taxRate) / 100;
        const subtotalWithTax = itemTotal + taxAmount;
        
        // Defensive ID validation to prevent 500 crashes
        const validProductId = isValidObjectId(item.productId) ? new ObjectId(item.productId) : null;
        if (!validProductId) {
          return res.status(400).json({ error: `Invalid product ID for item: ${item.productName}` });
        }

        const sale = {
          transactionId,
          productId: validProductId,
          productName: item.productName || '',
          quantity: parseInt(item.quantity),
          soldItemBarcode: item.soldItemBarcode ? item.soldItemBarcode.trim() : null,
          unitPrice: parseFloat(item.unitPrice) || 0,
          costPrice: parseFloat(item.costPrice) || 0,
          totalAmount: subtotalWithTax,
          taxAmount: taxAmount,
          profit: parseFloat(item.profit) || ((parseFloat(item.unitPrice) - parseFloat(item.costPrice)) * parseInt(item.quantity)),
          customerId: isValidObjectId(customerId) ? new ObjectId(customerId) : null,
          customerName: customerName || null,
          locationId: req.user.locationId, // Can be String (Admin) or ObjectId (Manager)
          workerName: req.user?.name || 'Admin',
          createdAt: now,
        };

        await db.collection('sales').insertOne(sale);

        // --- ROBUST STOCK UPDATE ---
        const locationIdStr = String(sale.locationId);
        const product = await db.collection('products').findOne({ _id: validProductId });
        
        if (!product) {
            return res.status(404).json({ error: `Product not found: ${item.productName}` });
        }

        // Identify if this is the DEFAULT store for legacy fallback
        const activeLoc = isValidObjectId(sale.locationId) ? await db.collection('locations').findOne({ _id: new ObjectId(sale.locationId) }) : null;
        const isDefaultStore = activeLoc?.isDefault || false;

        const hasLocationStockArr = Array.isArray(product.locationStock);
        const hasSpecificLocStock = hasLocationStockArr && product.locationStock.some(s => s.locationId === locationIdStr);

        let productUpdate = {};
        let updateOptions = {};

        if (hasSpecificLocStock) {
          // 1. Regular Multi-Store Update
          productUpdate = {
            $inc: { 'locationStock.$[elem].quantity': -sale.quantity },
            $set: { updatedAt: now },
          };
          if (sale.soldItemBarcode) {
            productUpdate.$pull = { 'locationStock.$[elem].itemBarcodes': sale.soldItemBarcode };
          }
          const filterLocationId = isValidObjectId(sale.locationId) ? new ObjectId(sale.locationId) : sale.locationId;
          updateOptions = { arrayFilters: [{ 'elem.locationId': filterLocationId }] };
        } 
        else if (hasLocationStockArr) {
          // 2. Multi-Store structure exists but NOT for this location: Initialize it
          productUpdate = {
            $push: { 
              locationStock: {
                locationId: locationIdStr,
                quantity: -sale.quantity,
                itemBarcodes: []
              }
            },
            $set: { updatedAt: now }
          };
        }
        else if (isDefaultStore) {
          // 3. Legacy Product in Default Store: Decrement root quantity
          productUpdate = {
            $inc: { quantity: -sale.quantity },
            $set: { updatedAt: now }
          };
          if (sale.soldItemBarcode) {
             productUpdate.$pull = { itemBarcodes: sale.soldItemBarcode };
          }
        }
        else {
          // 4. Legacy Product in New Store/Branch: Initialize multi-store structure
          // CRITICAL: We move existing root quantity to the Main Store entry to avoid data loss.
          // We'll find the default store ID to assign the existing quantity to it.
          const defaultLoc = await db.collection('locations').findOne({ isDefault: true });
          const defaultLocIdStr = defaultLoc ? String(defaultLoc._id) : 'main';
          const legacyQty = parseInt(product.quantity) || 0;
          const legacyBarcodes = Array.isArray(product.itemBarcodes) ? product.itemBarcodes : (product.barcode ? [product.barcode] : []);

          let initialStock = [];
          
          if (locationIdStr === defaultLocIdStr) {
            // Selling from main store
            initialStock.push({
              locationId: locationIdStr,
              quantity: legacyQty - sale.quantity,
              itemBarcodes: legacyBarcodes
            });
          } else {
            // Selling from a branch: Keep main store stock as is, and add branch entry
            initialStock.push({
              locationId: defaultLocIdStr,
              quantity: legacyQty,
              itemBarcodes: legacyBarcodes
            });
            initialStock.push({
              locationId: locationIdStr,
              quantity: -sale.quantity,
              itemBarcodes: []
            });
          }

          productUpdate = {
            $set: { 
              locationStock: initialStock,
              updatedAt: now 
            },
            $unset: {
              quantity: "",
              itemBarcodes: ""
            }
          };
        }

        await db.collection('products').updateOne(
          { _id: validProductId },
          productUpdate,
          updateOptions
        );

        saleRecords.push(sale);
        totalTransactionAmount += subtotalWithTax;
      }

      // Update customer totalSpent and balance if valid customerId is provided
      if (isValidObjectId(customerId)) {
        await db.collection('customers').updateOne(
          { _id: new ObjectId(customerId) },
          { 
            $inc: { 
              totalSpent: totalTransactionAmount,
              balance: -totalTransactionAmount 
            },
            $set: { updatedAt: now }
          }
        );
      }

      const itemsSummary = saleRecords.map(s => `${s.quantity}x ${s.productName}`).join(', ');
      await logActivity(req.user, 'SALE_RECORDED', `Transaction ${transactionId}${customerName ? ` for ${customerName}` : ''}: ${itemsSummary} — Total: ${totalTransactionAmount}`);

      // Create admin notification
      await db.collection('notifications').insertOne({
        type: 'sale',
        message: `New sale of ${totalTransactionAmount} recorded by ${req.user?.name || 'Admin'}`,
        transactionId,
        readBy: [],
        targetRole: 'admin',
        createdAt: now,
      });

      return res.status(201).json({
        message: 'Sale recorded',
        transactionId,
        sale: saleRecords.length === 1 ? saleRecords[0] : undefined,
        sales: saleRecords,
        totalAmount: totalTransactionAmount,
      });
    }

    if (req.method === 'DELETE') {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }

      const { before } = req.query;
      if (!before) {
        return res.status(400).json({ error: 'Missing before date parameter for bulk deletion.' });
      }

      const beforeDate = new Date(before);
      if (isNaN(beforeDate.getTime())) {
        return res.status(400).json({ error: 'Invalid "before" date format' });
      }

      const result = await db.collection('sales').deleteMany({
        createdAt: { $lt: beforeDate }
      });

      await logActivity(req.user, 'SALES_BULK_DELETE', `Deleted sales older than ${before}`);

      return res.status(200).json({ 
        message: `Successfully deleted ${result.deletedCount} old sales entries.` 
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Sales API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
module.exports = withAuth(salesHandler);
