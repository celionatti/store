/**
 * Customers API — GET all / POST new / PUT update
 * Route: /api/customers
 */
const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../_utils/db');
const { withAuth } = require('../_utils/auth');

async function customersHandler(req, res) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('customers');
    const locCol = db.collection('locations');

    const locationId = req.user.locationId;
    const locationIdStr = (locationId && ObjectId.isValid(String(locationId))) ? String(locationId) : null;

    // Identify if this is the DEFAULT store for legacy fallback
    const activeLoc = locationIdStr ? await locCol.findOne({ _id: new ObjectId(locationIdStr) }) : null;
    const isDefaultStore = activeLoc?.isDefault || false;

    // GET /api/customers
    if (req.method === 'GET') {
      const { id, search } = req.query;
      
      if (id && ObjectId.isValid(id)) {
        const customer = await collection.findOne({ _id: new ObjectId(id) });
        if (!customer) return res.status(404).json({ error: 'Customer not found' });
        
        // Security: Check if customer is visible to this store
        const isVisible = customer.isGlobal || 
                          (customer.locationIds && customer.locationIds.includes(locationIdStr)) ||
                          (isDefaultStore && (!customer.locationIds || customer.locationIds.length === 0));
        
        if (!isVisible && req.user.role !== 'admin') {
          return res.status(403).json({ error: 'Access denied: Customer belongs to another branch' });
        }
        return res.status(200).json({ customer });
      }

      // Filter: Show Global OR Assigned Store OR Legacy (if default store)
      const filter = {
        $or: [
          { isGlobal: true },
          { locationIds: locationIdStr },
          ...(isDefaultStore ? [{ $or: [{ locationIds: { $exists: false } }, { locationIds: { $size: 0 } }] }] : [])
        ]
      };

      if (search) {
        filter.$and = [
          { $or: [
            { name: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]}
        ];
      }

      const customers = await collection.find(filter).sort({ name: 1 }).toArray();
      return res.status(200).json({ customers });
    }

    // POST /api/customers (With Smart Linking)
    if (req.method === 'POST') {
      const body = req.body;
      if (!body.name) return res.status(400).json({ error: 'Customer name is required' });

      const email = (body.email || '').toLowerCase().trim();
      const phone = (body.phone || '').trim();

      // Check if customer exists globally (same phone or email)
      const existingQuery = [];
      if (email) existingQuery.push({ email });
      if (phone) existingQuery.push({ phone });

      if (existingQuery.length > 0) {
        const existing = await collection.findOne({ $or: existingQuery });
        if (existing) {
          // LINKING LOGIC: If they exist, just add this store to their visibility list
          const update = { $addToSet: { locationIds: locationIdStr } };
          if (body.isGlobal) update.$set = { isGlobal: true };
          
          await collection.updateOne({ _id: existing._id }, update);
          return res.status(200).json({ 
            ...existing, 
            message: 'Existing customer linked to this branch',
            isNew: false 
          });
        }
      }

      const customer = {
        name: body.name.trim(),
        email,
        phone,
        balance: parseFloat(body.balance) || 0,
        totalSpent: 0,
        isGlobal: !!body.isGlobal,
        locationIds: locationIdStr ? [locationIdStr] : [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await collection.insertOne(customer);
      return res.status(201).json({ ...customer, _id: result.insertedId, isNew: true });
    }

    // PUT /api/customers
    if (req.method === 'PUT') {
      let { id } = req.query;
      const body = req.body;
      
      if (!id) {
        const rawUrl = (req.url || '').split('?')[0];
        const urlParts = rawUrl.split('/').filter(Boolean);
        id = urlParts[urlParts.length - 1];
      }

      if (!id || !ObjectId.isValid(id)) return res.status(400).json({ error: 'Customer ID is required' });

      const update = { updatedAt: new Date() };
      if (body.name) update.name = body.name.trim();
      if (body.email) update.email = body.email.toLowerCase().trim();
      if (body.phone) update.phone = body.phone.trim();
      if (body.balance !== undefined) update.balance = parseFloat(body.balance) || 0;
      if (body.isGlobal !== undefined) update.isGlobal = !!body.isGlobal;

      // Restrict update: must be visible to this store or Admin
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: update },
        { returnDocument: 'after' }
      );

      if (!result) return res.status(404).json({ error: 'Customer not found' });
      return res.status(200).json({ customer: result });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Customers API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = withAuth(customersHandler);
