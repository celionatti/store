/**
 * Dashboard API — Aggregated stats
 * Route: /api/dashboard
 */
const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../_utils/db');
const { withAuth } = require('../_utils/auth');

async function dashboardHandler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    const productsCol = db.collection('products');
    const salesCol = db.collection('sales');
    const locCol = db.collection('locations');

    const locationId = req.user.locationId;
    let locationIdStr = null;
    if (locationId) {
      locationIdStr = String(locationId);
    }

    // Determine if this is the DEFAULT location
    const activeLoc = locationIdStr && ObjectId.isValid(locationIdStr) ? await locCol.findOne({ _id: new ObjectId(locationIdStr) }) : null;
    const isDefaultStore = activeLoc?.isDefault || false;

    // 1. Isolation Filters
    // Metric isolation for Sales/Expenses (matches both String and ObjectId due to legacy typing)
    const locIdObj = (locationIdStr && ObjectId.isValid(locationIdStr)) ? new ObjectId(locationIdStr) : null;
    const locationIds = locIdObj ? [locationIdStr, locIdObj] : [locationIdStr];

    const entryFilter = isDefaultStore 
      ? { $or: [{ locationId: { $in: locationIds } }, { locationId: { $exists: false } }, { locationId: null }] }
      : { locationId: { $in: locationIds } };

    // Metric isolation for Products
    const productFilter = isDefaultStore
      ? { $or: [{ "locationStock.locationId": locationIdStr }, { locationStock: { $exists: false } }, { locationStock: { $size: 0 } }] }
      : { "locationStock.locationId": locationIdStr };

    /**
     * Aggregation Pipeline Step for local quantity
     */
    const addEffectiveQtyStep = {
      $addFields: {
        effectiveQty: {
          $let: {
            vars: {
              matched: {
                $filter: {
                  input: { $ifNull: ["$locationStock", []] },
                  as: "s",
                  cond: { $eq: ["$$s.locationId", locationIdStr] }
                }
              }
            },
            in: {
              $let: {
                vars: { hasMatched: { $gt: [{ $size: "$$matched" }, 0] } },
                in: {
                  $cond: [
                    "$$hasMatched",
                    { $arrayElemAt: ["$$matched.quantity", 0] },
                    isDefaultStore ? { $ifNull: ["$quantity", 0] } : 0
                  ]
                }
              }
            }
          }
        }
      }
    };

    // 1. Total products (Isolated)
    const totalProducts = await productsCol.countDocuments(productFilter);

    // 2. Inventory values
    const inventoryValues = await productsCol.aggregate([
      { $match: productFilter },
      addEffectiveQtyStep,
      {
        $group: {
          _id: null,
          totalCost: { $sum: { $multiply: [{ $ifNull: ['$costPrice', 0] }, '$effectiveQty'] } },
          totalSelling: { $sum: { $multiply: [{ $ifNull: ['$sellingPrice', 0] }, '$effectiveQty'] } },
        },
      },
    ]).toArray();
    const investmentValue = inventoryValues[0]?.totalCost || 0;
    const potentialValue = inventoryValues[0]?.totalSelling || 0;

    // 3. Low stock (Isolated)
    const lowStockProducts = await productsCol.aggregate([
      { $match: productFilter },
      addEffectiveQtyStep,
      { $match: { $expr: { $lte: ["$effectiveQty", { $ifNull: ["$reorderLevel", 0] }] } } },
      { $sort: { effectiveQty: 1 } },
      { $limit: 10 },
      { $project: { name: 1, sku: 1, quantity: "$effectiveQty", reorderLevel: 1 } }
    ]).toArray();

    // 4. Sales Metrics (Isolated)
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todaySalesRes = await salesCol.aggregate([
      { $match: { createdAt: { $gte: todayStart }, ...entryFilter } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]).toArray();

    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const monthSalesRes = await salesCol.aggregate([
      { $match: { createdAt: { $gte: monthStart }, ...entryFilter } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]).toArray();

    // 5. Revenue Trend (Isolated)
    const period = req.query.period || 'monthly';
    let groupBy = {};
    if (period === 'daily') {
      groupBy = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } };
    } else if (period === 'weekly') {
      groupBy = { year: { $isoWeekYear: '$createdAt' }, week: { $isoWeek: '$createdAt' } };
    } else {
      groupBy = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };
    }

    const sortGroup = {};
    for (let key in groupBy) sortGroup[`_id.${key}`] = 1;

    const trendAgg = await salesCol.aggregate([
      { $match: entryFilter },
      { $sort: { createdAt: -1 } },
      { $limit: 1000 },
      {
        $group: {
          _id: groupBy,
          total: { $sum: '$totalAmount' },
        },
      },
      { $sort: sortGroup }
    ]).toArray();

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueByMonth = trendAgg.map(t => {
      let label = '';
      if (period === 'daily') {
         label = `${monthNames[t._id.month - 1]} ${t._id.day}, ${t._id.year}`;
      } else if (period === 'weekly') {
         label = `Week ${t._id.week}, ${t._id.year}`;
      } else {
         label = `${monthNames[t._id.month - 1]} ${t._id.year}`;
      }
      return { label, total: t.total };
    });

    // 6. Category Breakdown (Isolated)
    const categoryAgg = await productsCol.aggregate([
      { $match: productFilter },
      addEffectiveQtyStep,
      { $match: { effectiveQty: { $gt: 0 } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    // Filter sensitive metrics for Manager role
    const isAdmin = req.user.role === 'admin';
    const finalInvestmentValue = isAdmin ? investmentValue : 0;
    const finalPotentialValue = isAdmin ? potentialValue : 0;

    return res.status(200).json({
      totalProducts,
      investmentValue: finalInvestmentValue,
      potentialValue: finalPotentialValue,
      todaySales: todaySalesRes[0]?.total || 0,
      monthlyRevenue: monthSalesRes[0]?.total || 0,
      lowStockProducts,
      revenueByMonth,
      categoryBreakdown: categoryAgg.map(c => ({
        category: c._id || 'Uncategorized',
        count: c.count
      }))
    });
  } catch (err) {
    console.error('Dashboard API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
module.exports = withAuth(dashboardHandler);
