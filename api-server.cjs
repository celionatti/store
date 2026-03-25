const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = 3001;

app.use(express.json());

// Mock Vercel serverless environment
app.all('/api/{*path}', async (req, res) => {
  console.log(`[API Debug] Method: ${req.method}, URL: ${req.url}, Params: ${JSON.stringify(req.params)}`);
  
  // Express v5: req.params.path is an array of segments for {*path} wildcard
  const rawPath = Array.isArray(req.params.path)
    ? req.params.path.join('/')
    : (req.params.path || '');
  console.log(`[API Debug] rawPath: ${rawPath}`);
  const apiPath = '/' + rawPath.split('?')[0]; 
  
  // Try to find the file in the api folder
  // 1. Check for exact file: api/[path].js
  // 2. Check for index file: api/[path]/index.js
  // 3. Check for dynamic routes: api/products/[id].js
  
  let filePath = null;
  let query = { ...req.query };

  // Debug: Log body status
  console.log(`[API Debug] Method: ${req.method}, Body present: ${!!req.body}, Body Keys: ${req.body ? Object.keys(req.body) : 'N/A'}`);
  
  // Robust body parsing fallback
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && (!req.body || Object.keys(req.body).length === 0)) {
    if (typeof req.body === 'string' && req.body.trim().startsWith('{')) {
      try { req.body = JSON.parse(req.body); } catch(e) {}
    }
  }

  const fullPath = path.join(__dirname, 'api', apiPath);
  
  if (fs.existsSync(fullPath + '.js')) {
    filePath = fullPath + '.js';
  } else if (fs.existsSync(path.join(fullPath, 'index.js'))) {
    filePath = path.join(fullPath, 'index.js');
  } else {
    // Dynamic route matching (naive [id] matching)
    const segments = apiPath.split('/');
    if (segments.length > 0) {
      const parentDir = path.join(__dirname, 'api', ...segments.slice(0, -1));
      if (fs.existsSync(parentDir)) {
        const files = fs.readdirSync(parentDir);
        const dynamicFile = files.find(f => f.startsWith('[') && f.endsWith('].js'));
        if (dynamicFile) {
          filePath = path.join(parentDir, dynamicFile);
          const paramName = dynamicFile.slice(1, -4); // [id] -> id
          query[paramName] = segments[segments.length - 1];
        }
      }
    }
  }

  if (filePath) {
    console.log(`[API] Serving ${req.method} ${req.url} -> ${filePath}`);
    try {
      // Clear cache for hot reloading
      delete require.cache[require.resolve(filePath)];
      const handler = require(filePath);
      
      // Merge query params
      req.query = { ...query, ...req.query };

      // Call handler directly with native Express req and res
      await handler(req, res);
      console.log(`[API Success] ${req.method} ${req.url} handled successfully`);
    } catch (err) {
      console.error(`[API Error] Request: ${req.method} ${req.url}`);
      console.error(`[API Error] Stack Trace: ${err.stack}`);
      res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
  } else {
    console.warn(`[API] 404 - No handler found for ${req.url}`);
    res.status(404).json({ error: 'Endpoint not found' });
  }
});

const server = app.listen(PORT, () => {
  console.log(`[API Server] Running at http://localhost:${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[API Error] CRITICAL: Port ${PORT} is already in use.`);
    console.error(`[API Error] SUGGESTION: Run 'netstat -ano | findstr :${PORT}' and kill the process using 'taskkill /F /PID <pid>'.`);
    process.exit(1);
  } else {
    console.error(`[API Error] Failed to start server: ${err.message}`);
  }
});
