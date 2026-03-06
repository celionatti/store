/**
 * Expenses API — POST new / GET range
 * Route: /api/expenses
 */
const { connectToDatabase } = require('../_utils/db');
const { withAuth } = require('../_utils/auth');

async function expensesHandler(req, res) {
  try {
    const { db } = await connectToDatabase();

    if (req.method === 'GET') {
      const { from, to } = req.query || {};
      const filter = {};

      if (from || to) {
        filter.date = {};
        if (from) filter.date.$gte = new Date(from);
        if (to) {
          const toDate = new Date(to);
          toDate.setHours(23, 59, 59, 999);
          filter.date.$lte = toDate;
        }
      }

      const expenses = await db.collection('expenses')
        .find(filter)
        .sort({ date: -1 })
        .toArray();

      return res.status(200).json({ expenses });
    }

    if (req.method === 'POST') {
      const { amount, category, description, date } = req.body;
      
      if (!amount || !category) {
        return res.status(400).json({ error: 'Amount and Category are required' });
      }

      const expense = {
        amount: parseFloat(amount),
        category: category.trim(),
        description: (description || '').trim(),
        date: date ? new Date(date) : new Date(),
        createdAt: new Date(),
      };

      await db.collection('expenses').insertOne(expense);
      return res.status(201).json({ message: 'Expense recorded', expense });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Expenses API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = withAuth(expensesHandler);
