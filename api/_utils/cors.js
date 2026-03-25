/**
 * CORS Utility
 * 
 * Centralized CORS handler to replace wildcard origin policies.
 */

// Allow local development ports and production domains
const ALLOWED_ORIGINS = [
  'http://localhost:5173', // Vite default
  'http://localhost:3000', // Alternative React default
  'http://localhost:3001', // Local API server
  // process.env.FRONTEND_URL can be set in production
];

if (process.env.FRONTEND_URL) {
  ALLOWED_ORIGINS.push(process.env.FRONTEND_URL);
}

/**
 * Applies strict CORS headers to the response object if the origin is allowed.
 * @param {object} req - Express/Vercel Request
 * @param {object} res - Express/Vercel Response
 */
function applyCorsHeaders(req, res) {
  const origin = req.headers.origin;
  
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Allow same-origin requests (e.g., Postman / curl during dev, or proxy setups where origin isn't forwarded)
    // Only in development or backend-to-backend calls
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    // In strict production, you might not set it at all if origin is missing. 
    // For Vercel, leaving it as * when no origin is provided is often necessary for server-to-server calls to work.
  }
  
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );
}

module.exports = { applyCorsHeaders };
