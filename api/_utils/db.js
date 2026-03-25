/**
 * MongoDB Connection Utility for Vercel Serverless Functions
 */
const { MongoClient } = require('mongodb');

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
    console.log(`[DB] Connecting to MongoDB (URI: ${maskedUri})...`);
    await client.connect();
    const db = client.db('store-inventory');
    cachedClient = client;
    cachedDb = db;
    console.log(`[DB] Successfully connected to database: store-inventory`);
    return { client: cachedClient, db: cachedDb };
  } catch (err) {
    console.error(`[DB Error] Failed to connect to MongoDB: ${err.message}`);
    throw err;
  }
}

module.exports = { connectToDatabase };
