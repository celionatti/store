/**
 * MongoDB Connection Utility for Vercel Serverless Functions
 */
const { MongoClient } = require('mongodb');
const dns = require('dns');

// Force Node to use Google's DNS to prevent 'querySrv ECONNREFUSED' 
// occurring due to local Windows or VPN/ISP DNS resolution failures.
dns.setServers(['8.8.8.8', '8.8.4.4']);

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[DB Error] MONGODB_URI is not defined in environment variables');
    throw new Error('MONGODB_URI environment variable is not set');
  }

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });

  try {
    const maskedUri = uri.replace(/\/\/.*:.*@/, '//****:****@');
    const dbName = process.env.MONGODB_DB_NAME || 'store-inventory';
    console.log(`[DB] Connecting to MongoDB (URI: ${maskedUri}) for DB: ${dbName}...`);
    await client.connect();
    const db = client.db(dbName);
    cachedClient = client;
    cachedDb = db;
    console.log(`[DB] Successfully connected to database: ${dbName}`);
    return { client: cachedClient, db: cachedDb };
  } catch (err) {
    console.error(`[DB Error] Failed to connect to MongoDB: ${err.message}`);
    throw err;
  }
}

module.exports = { connectToDatabase };
