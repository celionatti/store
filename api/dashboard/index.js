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

    // Inventory value
    const inventoryAgg = await productsCol.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$sellingPrice', '$quantity'] } },
        },
      },
    ]).toArray();
    const inventoryValue = inventoryAgg[0]?.totalValue || 0;

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

    // Revenue by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const revenueByMonth = await salesCol.aggregate([
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

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedRevenue = revenueByMonth.map(m => ({
      label: `${monthNames[m._id.month - 1]} ${m._id.year}`,
      total: m.total,
    }));

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
      inventoryValue,
      todaySales,
      monthlyRevenue,
      lowStockProducts,
      revenueByMonth: formattedRevenue,
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
