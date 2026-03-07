const express = require("express");
const serverless = require("serverless-http");
const path = require("path");
const fs = require("fs");

// Dependency hints for Netlify bundler (since we use dynamic requires)
try {
  require("mongodb");
} catch (e) {
  // Ignore at runtime, this is just for the bundler
}

const app = express();
app.use(express.json());

// Mock Vercel serverless environment logic
app.all('{*path}', async (req, res) => {
  // Normalize path
  let apiPath = req.path;
  if (apiPath.startsWith('/.netlify/functions/api')) {
    apiPath = apiPath.replace('/.netlify/functions/api', '');
  }
  if (apiPath.startsWith('/api')) {
    apiPath = apiPath.replace('/api', '');
  }
  if (!apiPath.startsWith('/')) apiPath = '/' + apiPath;

  if (apiPath === '/health' || apiPath === '/status') {
    return res.status(200).json({ status: 'ok', message: 'API Bridge is running' });
  }

  console.log(`[Netlify Bridge] Request: ${req.method} ${req.path} -> normalized apiPath: ${apiPath}`);

  let filePath = null;
  let query = { ...req.query };

  // Debug: Log body status
  console.log(`[Netlify Bridge] Method: ${req.method}, Body present: ${!!req.body}, Body Keys: ${req.body ? Object.keys(req.body) : 'N/A'}`);
  
  // Robust body parsing fallback (Netlify body can be stringified)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && (!req.body || Object.keys(req.body).length === 0)) {
    if (typeof req.body === 'string' && req.body.trim().startsWith('{')) {
      try { req.body = JSON.parse(req.body); } catch(e) {}
    }
  }

  // Try different ways to find the api folder
  const roots = [
    process.cwd(),
    path.join(__dirname, '..', '..'), // Relative to netlify/functions/api.js
    path.join(__dirname, '..'),
    __dirname
  ];

  let apiFolder = null;
  for (const root of roots) {
    const candidate = path.join(root, 'api');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      apiFolder = candidate;
      break;
    }
  }

  if (!apiFolder) {
    console.error(`[Netlify Bridge] Error: Could not find 'api' folder in any of: ${roots.join(', ')}`);
    return res.status(500).json({ error: 'API environment misconfigured', details: 'api folder not found' });
  }

  const fullPath = path.join(apiFolder, apiPath);
  console.log(`[Netlify Bridge] Resolved candidate path: ${fullPath}`);
  
  if (fs.existsSync(fullPath + '.js')) {
    filePath = fullPath + '.js';
  } else if (fs.existsSync(path.join(fullPath, 'index.js'))) {
    filePath = path.join(fullPath, 'index.js');
  } else {
    // Dynamic route matching (naive [id] matching)
    const segments = apiPath.split('/').filter(Boolean);
    if (segments.length > 0) {
      const parentDir = path.join(apiFolder, ...segments.slice(0, -1));
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
    console.log(`[Netlify Bridge] Loading handler: ${filePath}`);
    try {
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
        },
        // Add more mocks if needed
        send: (data) => {
          res.send(data);
          return vRes;
        }
      };

      await handler(vReq, vRes);
      console.log(`[Netlify Bridge] Handler successfully executed`);
    } catch (err) {
      console.error(`[Netlify Bridge Error] ${err.stack || err.message}`);
      res.status(500).json({ 
        error: 'Internal Server Error', 
        details: err.message,
        stack: err.stack,
        path: req.path,
        apiPath: apiPath,
        resolvedPath: filePath
      });
    }
  } else {
    console.warn(`[Netlify Bridge] 404 - No match for ${apiPath}`);
    res.status(404).json({ error: 'Endpoint not found', path: req.path });
  }
});

module.exports.handler = serverless(app);
