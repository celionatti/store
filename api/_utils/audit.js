/**
 * Audit Logging Utility
 */
const { connectToDatabase } = require('./db');

async function logActivity(user, action, details) {
  try {
    const { db } = await connectToDatabase();
    const logsCol = db.collection('audit_logs');

    const logEntry = {
      userId: user.id,
      username: user.username,
      action, // e.g., 'SALE_CREATED', 'PRODUCT_UPDATED'
      details, // e.g., 'Sold iPhone 13 (IMEI: 12345)'
      timestamp: new Date(),
    };

    await logsCol.insertOne(logEntry);
  } catch (err) {
    console.error('Audit Log Error:', err);
    // We don't throw here to avoid breaking the main operation if logging fails
  }
}

module.exports = { logActivity };
