/**
 * Locations API — POST new / GET all / PUT update
 * Route: /api/locations
 */
const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../_utils/db');
const { withAuth } = require('../_utils/auth');

async function locationsHandler(req, res) {
  try {
    const { db } = await connectToDatabase();
    const col = db.collection('locations');

    if (req.method === 'GET') {
      let filter = {};
      
      // If user is not admin, theoretically they should only see their assigned location.
      // But for dropdowns or general structure rules, we might return all active ones, 
      // or filter based on user permissions. Let's return all active ones by default, 
      // unless an admin needs them all.
      
      const locations = await col.find(filter).toArray();

      // Auto-seed a Main Store if absolutely no locations exist
      if (locations.length === 0) {
        const defaultLocation = {
          name: 'Main Store',
          address: 'Headquarters',
          status: 'active',
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        const result = await col.insertOne(defaultLocation);
        defaultLocation._id = result.insertedId;
        locations.push(defaultLocation);
      }

      return res.status(200).json({ locations });
    }

    // Only Admins can modify locations
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can manage locations.' });
    }

    if (req.method === 'POST') {
      const { name, address, status, isDefault } = req.body;
      if (!name) return res.status(400).json({ error: 'Store name is required' });

      // If this is set to default, unset others
      if (isDefault) {
        await col.updateMany({}, { $set: { isDefault: false } });
      }

      const newLocation = {
        name: name.trim(),
        address: (address || '').trim(),
        status: status || 'active',
        isDefault: !!isDefault,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await col.insertOne(newLocation);
      newLocation._id = result.insertedId;

      return res.status(201).json({ message: 'Location created successfully', location: newLocation });
    }

    if (req.method === 'PUT') {
      const { id, name, address, status, isDefault } = req.body;
      
      if (!id) return res.status(400).json({ error: 'Location ID is required' });

      if (isDefault) {
        await col.updateMany({}, { $set: { isDefault: false } });
      }

      const updateData = { updatedAt: new Date() };
      if (name) updateData.name = name.trim();
      if (address !== undefined) updateData.address = address.trim();
      if (status) updateData.status = status;
      if (isDefault !== undefined) updateData.isDefault = !!isDefault;

      const result = await col.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) return res.status(404).json({ error: 'Location not found' });

      return res.status(200).json({ message: 'Location updated successfully', location: result });
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Location ID is required' });

      // Ensure we don't delete the default store if there are other stores
      const location = await col.findOne({ _id: new ObjectId(id) });
      if (!location) return res.status(404).json({ error: 'Location not found' });
      
      const count = await col.countDocuments();
      if (count <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last remaining store' });
      }
      
      // If deleting the default location, arbitrarily promote another to default
      if (location.isDefault) {
        const nextLocation = await col.findOne({ _id: { $ne: new ObjectId(id) } });
        if (nextLocation) {
          await col.updateOne({ _id: nextLocation._id }, { $set: { isDefault: true } });
        }
      }

      await col.deleteOne({ _id: new ObjectId(id) });

      // Optional: Delete or re-parent stock, products, sales... 
      // This is a placeholder since cascading deletes can be complex.
      // Usually, stores shouldn't be deleted if they have stock, but for MVP we allow it.

      return res.status(200).json({ message: 'Location deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Locations API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = withAuth(locationsHandler);
