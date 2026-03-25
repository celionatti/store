/**
 * Expenses API — DELETE individual expense
 * Route: /api/expenses/:id
 */
const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../_utils/db');
const { withAuth } = require('../_utils/auth');
const { logActivity } = require('../_utils/audit');

async function singleExpenseHandler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  try {
    const { db } = await connectToDatabase();
    
    // Extraction strategy for [id].js
    let id = req.query?.id;
    if (!id) {
       const urlParts = req.url.split('?')[0].split('/');
       id = urlParts[urlParts.length - 1];
    }

    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid expense ID' });
    }

    const expenseId = new ObjectId(id);
    const expense = await db.collection('expenses').findOne({ _id: expenseId });
    
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const result = await db.collection('expenses').deleteOne({ _id: expenseId });
    
    if (result.deletedCount === 1) {
      await logActivity(req.user, 'EXPENSE_DELETED', `Deleted expense of ${expense.amount} from category ${expense.category}`);
      return res.status(200).json({ message: 'Expense deleted successfully' });
    } else {
      return res.status(500).json({ error: 'Failed to delete expense' });
    }
  } catch (err) {
    console.error('Single Expense API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = withAuth(singleExpenseHandler);
