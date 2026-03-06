const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = 3001;

app.use(express.json());

// Mock Vercel serverless environment
app.all('/api/{*path}', async (req, res) => {
  // Express v5: req.params.path is an array of segments for {*path} wildcard
  const rawPath = Array.isArray(req.params.path)
    ? req.params.path.join('/')
    : (req.params.path || '');
  const apiPath = '/' + rawPath.split('?')[0]; 
  
  // Try to find the file in the api folder
  // 1. Check for exact file: api/[path].js
  // 2. Check for index file: api/[path]/index.js
  // 3. Check for dynamic routes: api/products/[id].js
  
  let filePath = null;
  let query = { ...req.query };

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
      
      // Mock Vercel req/res objects
      req.query = { ...query, ...req.query };
      const vReq = req;
      const vRes = {
        status: (code) => {
          res.status(code);
          return vRes;
        },
        json: (data) => {
          res.json(data);
          return vRes;
        },
        setHeader: (name, value) => {
          res.setHeader(name, value);
          return vRes;
        },
        end: (data) => {
          res.end(data);
          return vRes;
        }
      };

      await handler(vReq, vRes);
    } catch (err) {
      console.error(`[API Error] ${err.message}`);
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
    console.error(`[API Error] Port ${PORT} is already in use. Please kill the existing process first.`);
    process.exit(1);
  } else {
    console.error(`[API Error] Failed to start server: ${err.message}`);
  }
});
