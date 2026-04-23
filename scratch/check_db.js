const { MongoClient } = require('mongodb');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'store-inventory';

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    
    console.log('--- LOCATIONS ---');
    const locations = await db.collection('locations').find({}).toArray();
    console.log(JSON.stringify(locations, null, 2));
    
    console.log('\n--- CHECKING SPECIFIC LOCATION 69d6ebac9c78de88a91a5f8d ---');
    const specificLoc = await db.collection('locations').findOne({ _id: new ObjectId('69d6ebac9c78de88a91a5f8d') });
    console.log(JSON.stringify(specificLoc, null, 2));

    console.log('\n--- USERS ASSIGNMENT ---');
    const users = await db.collection('users').find({}).toArray();
    console.log(JSON.stringify(users.map(u => ({ username: u.username, role: u.role, locationId: u.locationId })), null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

run();
