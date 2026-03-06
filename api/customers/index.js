/**
 * Customers API — GET all / POST new
 * Route: /api/customers
 */
const { connectToDatabase } = require('../_utils/db');
const { withAuth } = require('../_utils/auth');

async function customersHandler(req, res) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('customers');

    // GET /api/customers
    if (req.method === 'GET') {
      const customers = await collection.find({}).sort({ createdAt: -1 }).toArray();
      return res.status(200).json({ customers });
    }

    // POST /api/customers
    if (req.method === 'POST') {
      const body = req.body;
      
      if (!body.name) {
        return res.status(400).json({ error: 'Customer name is required' });
      }

      // Check if phone or email already exists (if provided)
      if (body.email) {
        const existing = await collection.findOne({ email: body.email.toLowerCase().trim() });
        if (existing) {
          return res.status(409).json({ error: 'A customer with this email already exists' });
        }
      }
      
      if (body.phone) {
        const existing = await collection.findOne({ phone: body.phone.trim() });
        if (existing) {
          return res.status(409).json({ error: 'A customer with this phone number already exists' });
        }
      }

      const customer = {
        name: body.name.trim(),
        email: (body.email || '').toLowerCase().trim(),
        phone: (body.phone || '').trim(),
        totalSpent: 0, // Initial value
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await collection.insertOne(customer);
      return res.status(201).json({ ...customer, _id: result.insertedId });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Customers API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
module.exports = withAuth(customersHandler);
