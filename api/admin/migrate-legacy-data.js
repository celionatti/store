const { MongoClient, ObjectId } = require('mongodb');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'store-inventory';

async function migrate() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    
    // 1. Find the default location
    const defaultLoc = await db.collection('locations').findOne({ isDefault: true });
    if (!defaultLoc) {
      console.error('CRITICAL: No default location found. Please create one first.');
      process.exit(1);
    }
    const defaultLocIdStr = String(defaultLoc._id);
    console.log(`[Migration] Identified Default Location: ${defaultLoc.name} (${defaultLocIdStr})`);

    // 2. Migrate Products
    // Find products that have a root 'quantity' and NO 'locationStock'
    const legacyProducts = await db.collection('products').find({ 
      quantity: { $exists: true },
      $or: [
        { locationStock: { $exists: false } },
        { locationStock: { $size: 0 } }
      ]
    }).toArray();

    console.log(`[Migration] Found ${legacyProducts.length} legacy products.`);
    
    for (const prod of legacyProducts) {
      const quantity = parseInt(prod.quantity) || 0;
      const barcodes = Array.isArray(prod.itemBarcodes) ? prod.itemBarcodes : (prod.barcode ? [prod.barcode] : []);
      
      await db.collection('products').updateOne(
        { _id: prod._id },
        { 
          $set: { 
            locationStock: [{
              locationId: defaultLocIdStr,
              quantity: quantity,
              itemBarcodes: barcodes
            }],
            updatedAt: new Date()
          },
          $unset: {
            quantity: "",
            itemBarcodes: ""
          }
        }
      );
    }
    console.log(`[Migration] Successfully migrated products.`);

    // 3. Migrate Sales
    // Find sales without locationId
    const legacySales = await db.collection('sales').find({
      locationId: { $exists: false }
    }).toArray();

    console.log(`[Migration] Found ${legacySales.length} legacy sales.`);
    
    const resultSales = await db.collection('sales').updateMany(
      { locationId: { $exists: false } },
      { $set: { locationId: defaultLocIdStr } }
    );
    console.log(`[Migration] Successfully migrated ${resultSales.modifiedCount} sales.`);

    // 4. Migrate Activities/Logs if necessary
    const resultLogs = await db.collection('activities').updateMany(
      { locationId: { $exists: false } },
      { $set: { locationId: defaultLocIdStr } }
    );
    console.log(`[Migration] Updated ${resultLogs.modifiedCount} activity logs.`);

  } catch (err) {
    console.error('[Migration Error]', err);
  } finally {
    await client.close();
  }
}

migrate();
