/**
 * Auth Middleware — withAuth
 *
 * Extracts token from Authorization header and verifies it against the DB.
 * Ensures the user exists and has a matching active token.
 */
const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('./db');
const { applyCorsHeaders } = require('./cors');

function withAuth(handler) {
  return async (req, res) => {
    // CORS headers (often needed for cross-origin local dev)
    applyCorsHeaders(req, res);

    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res
          .status(401)
          .json({ error: "Unauthorized: No token provided" });
      }

      const token = authHeader.split(" ")[1];
      const { db } = await connectToDatabase();
      const usersCol = db.collection("users");
      const locCol = db.collection("locations");

      // Find user with this specific active token (supports both old string and new array format)
      const user = await usersCol.findOne({ 
        $or: [
          { activeTokens: token },
          { activeToken: token }
        ]
      });

      if (!user) {
        return res
          .status(401)
          .json({ error: "Unauthorized: Invalid or revoked token" });
      }

      // Security Logic: Only Administrators can switch the session context (location).
      // Managers and Workers are hard-locked to their profile's assigned locationId.
      const requestedLocation = req.headers['x-location-id'];
      const isAdmin = user.role === 'admin';
      
      let finalLocationId = (isAdmin && requestedLocation) ? requestedLocation : (user.locationId || null);

      // Verify if the finalLocationId is VALID and exists in the DB
      let activeLoc = null;
      if (finalLocationId && ObjectId.isValid(String(finalLocationId))) {
        activeLoc = await locCol.findOne({ _id: new ObjectId(String(finalLocationId)) });
      }

      // Fallback: If no location is specified OR the specified location is INVALID,
      // automatically default to the 'isDefault' store from the DB.
      if (!activeLoc) {
        const defaultLoc = await locCol.findOne({ isDefault: true });
        if (defaultLoc) {
          finalLocationId = String(defaultLoc._id);
          console.log(`[Auth] Fallback: Active store set to Default Store (${finalLocationId}) for user ${user.username}`);
        } else {
          // Absolute fallback if no default store exists
          finalLocationId = String(finalLocationId); 
        }
      } else {
          finalLocationId = String(activeLoc._id);
      }

      req.user = {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role || 'worker',
        locationId: finalLocationId
      };

      return handler(req, res);
    } catch (err) {
      console.error("Auth Middleware Error:", err);
      return res
        .status(500)
        .json({ error: "Internal server error during authentication" });
    }
  };
}

module.exports = { withAuth };
