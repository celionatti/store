/**
 * Rate Limiting Utility
 * 
 * Uses MongoDB to track failed attempts by IP address to prevent brute-force attacks.
 */
const { connectToDatabase } = require('./db');

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME_MINUTES = 15;

/**
 * Checks if the given IP address is currently blocked due to too many failed attempts.
 * @param {string} ipAddress - The client's IP address
 * @returns {Promise<{isBlocked: boolean, remainingTimeMs: number}>}
 */
async function checkRateLimit(ipAddress) {
  if (!ipAddress) return { isBlocked: false, remainingTimeMs: 0 };

  const { db } = await connectToDatabase();
  const rateLimitCol = db.collection('rate_limits');

  const record = await rateLimitCol.findOne({ ip: ipAddress });

  if (record && record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    const timeSinceLastFailure = Date.now() - record.lastFailedAt.getTime();
    const lockTimeMs = LOCK_TIME_MINUTES * 60 * 1000;

    if (timeSinceLastFailure < lockTimeMs) {
      return { 
        isBlocked: true, 
        remainingTimeMs: lockTimeMs - timeSinceLastFailure 
      };
    } else {
      // Lock has expired, reset it
      await rateLimitCol.updateOne(
        { ip: ipAddress },
        { 
          $set: { 
            failedAttempts: 0, 
            lastFailedAt: new Date() 
          } 
        }
      );
      return { isBlocked: false, remainingTimeMs: 0 };
    }
  }

  return { isBlocked: false, remainingTimeMs: 0 };
}

/**
 * Increments the failed attempt counter for the given IP address.
 * @param {string} ipAddress - The client's IP address
 */
async function recordFailedAttempt(ipAddress) {
  if (!ipAddress) return;

  const { db } = await connectToDatabase();
  const rateLimitCol = db.collection('rate_limits');

  await rateLimitCol.updateOne(
    { ip: ipAddress },
    { 
      $inc: { failedAttempts: 1 },
      $set: { lastFailedAt: new Date() }
    },
    { upsert: true }
  );
}

/**
 * Resets the failed attempt counter for the given IP address (e.g., on successful login).
 * @param {string} ipAddress - The client's IP address
 */
async function resetFailedAttempts(ipAddress) {
  if (!ipAddress) return;

  const { db } = await connectToDatabase();
  const rateLimitCol = db.collection('rate_limits');

  await rateLimitCol.deleteOne({ ip: ipAddress });
}

module.exports = {
  checkRateLimit,
  recordFailedAttempt,
  resetFailedAttempts
};
