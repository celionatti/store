/**
 * Auth Middleware — withAuth
 *
 * Extracts token from Authorization header and verifies it against the DB.
 * Ensures the user exists and has a matching active token.
 */
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

      // Inject user into req for downstream use
      req.user = {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
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
