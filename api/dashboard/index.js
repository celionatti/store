/**
 * Dashboard API — Aggregated stats
 * Route: /api/dashboard
 */
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

    // Total products
    const totalProducts = await productsCol.countDocuments();

    // Inventory values (Investment vs Potential)
    const inventoryAgg = await productsCol.aggregate([
      {
        $group: {
          _id: null,
          totalCost: { $sum: { $multiply: ['$costPrice', '$quantity'] } },
          totalSelling: { $sum: { $multiply: ['$sellingPrice', '$quantity'] } },
        },
      },
    ]).toArray();
    const investmentValue = inventoryAgg[0]?.totalCost || 0;
    const potentialValue = inventoryAgg[0]?.totalSelling || 0;

    // Low stock products
    const lowStockProducts = await productsCol.find({
      $expr: { $lte: ['$quantity', '$reorderLevel'] },
    }).sort({ quantity: 1 }).limit(10).toArray();

    // Today's sales
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todaySalesAgg = await salesCol.aggregate([
      { $match: { createdAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]).toArray();
    const todaySales = todaySalesAgg[0]?.total || 0;

    // Monthly revenue (current month)
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthlyRevenueAgg = await salesCol.aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]).toArray();
    const monthlyRevenue = monthlyRevenueAgg[0]?.total || 0;

    // Revenue Trend Aggregation
    const { period = 'monthly' } = req.query;
    let revenueData = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (period === 'daily') {
      // Last 14 days
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      fourteenDaysAgo.setHours(0, 0, 0, 0);

      const dailyAgg = await salesCol.aggregate([
        { $match: { createdAt: { $gte: fourteenDaysAgo } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            total: { $sum: '$totalAmount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]).toArray();

      revenueData = dailyAgg.map(d => ({
        label: `${d._id.day} ${monthNames[d._id.month - 1]}`,
        total: d.total,
      }));
    } else if (period === 'weekly') {
      // Last 12 weeks
      const twelveWeeksAgo = new Date();
      twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - (12 * 7));
      twelveWeeksAgo.setHours(0, 0, 0, 0);

      const weeklyAgg = await salesCol.aggregate([
        { $match: { createdAt: { $gte: twelveWeeksAgo } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              week: { $week: '$createdAt' },
            },
            total: { $sum: '$totalAmount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.week': 1 } },
      ]).toArray();

      revenueData = weeklyAgg.map(w => ({
        label: `Wk ${w._id.week}, ${w._id.year}`,
        total: w.total,
      }));
    } else {
      // Monthly (Default) - Last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      sixMonthsAgo.setHours(0, 0, 0, 0);

      const monthlyAgg = await salesCol.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            total: { $sum: '$totalAmount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]).toArray();

      revenueData = monthlyAgg.map(m => ({
        label: `${monthNames[m._id.month - 1]} ${m._id.year}`,
        total: m.total,
      }));
    }

    // Category breakdown
    const categoryBreakdown = await productsCol.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]).toArray();

    return res.status(200).json({
      totalProducts,
      investmentValue,
      potentialValue,
      todaySales,
      monthlyRevenue,
      lowStockProducts,
      revenueByMonth: revenueData, // Keep key name for compat or rename later
      categoryBreakdown: categoryBreakdown.map(c => ({
        category: c._id || 'Uncategorized',
        count: c.count,
      })),
    });
  } catch (err) {
    console.error('Dashboard API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
module.exports = withAuth(dashboardHandler);
