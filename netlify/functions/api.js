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

// Custom Netlify Body Parser Middleware
app.use((req, res, next) => {
  if (req.apiGateway && req.apiGateway.event && req.apiGateway.event.body) {
    let rawBody = req.apiGateway.event.body;
    if (req.apiGateway.event.isBase64Encoded) {
      rawBody = Buffer.from(rawBody, 'base64').toString('utf-8');
    }
    
    // Inject parsed JSON into req.body directly
    try {
      req.body = JSON.parse(rawBody);
    } catch(e) {
      req.body = rawBody;
    }
  }
  next();
});

app.use(express.json());

// Mock Vercel serverless environment logic - Universal handler with NO path string to avoid path-to-regexp issues
app.use(async (req, res) => {
  // Normalize path
  let apiPath = req.path || '/';
  
  // Strip Netlify / API prefixes
  apiPath = apiPath.replace(/^\/\.netlify\/functions\/api/, '').replace(/^\/api/, '');
  if (!apiPath.startsWith('/')) apiPath = '/' + apiPath;

  // Manual internal routing for diagnostics
  if (apiPath === '/api-debug' || apiPath.endsWith('/api-debug')) {
    return res.json({
      cwd: process.cwd(),
      dirname: __dirname,
      apiPath,
      apiExists: fs.existsSync(path.join(process.cwd(), 'api')),
      apiContents: fs.existsSync(path.join(process.cwd(), 'api')) ? fs.readdirSync(path.join(process.cwd(), 'api')) : null,
    });
  }

  if (apiPath === '/health' || apiPath === '/status') {
    return res.status(200).json({ status: 'ok', message: 'API Bridge is running' });
  }

  console.log(`[Netlify Bridge] Request: ${req.method} ${req.path} -> ${apiPath}`);

  // Find the 'api' folder
  const roots = [process.cwd(), path.join(__dirname, '..', '..'), path.join(__dirname, '..'), __dirname];
  let apiFolder = null;
  for (const root of roots) {
    const candidate = path.join(root, 'api');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      apiFolder = candidate;
      break;
    }
  }

  if (!apiFolder) {
    console.error(`[Netlify Bridge] Error: Could not find 'api' folder in: ${roots.join(', ')}`);
    return res.status(500).json({ 
      error: 'API environment misconfigured', 
      details: 'api folder not found',
      diagnostics: { cwd: process.cwd(), dirname: __dirname, roots } 
    });
  }

  const fullPath = path.join(apiFolder, apiPath);
  let filePath = null;
  let query = { ...req.query };

  if (fs.existsSync(fullPath + '.js')) {
    filePath = fullPath + '.js';
  } else if (fs.existsSync(path.join(fullPath, 'index.js'))) {
    filePath = path.join(fullPath, 'index.js');
  } else {
    // Dynamic route matching
    const segments = apiPath.split('/').filter(Boolean);
    if (segments.length > 0) {
      const parentDir = path.join(apiFolder, ...segments.slice(0, -1));
      if (fs.existsSync(parentDir)) {
        const files = fs.readdirSync(parentDir);
        const dynamicFile = files.find(f => f.startsWith('[') && f.endsWith('].js'));
        if (dynamicFile) {
          filePath = path.join(parentDir, dynamicFile);
          const paramName = dynamicFile.slice(1, -4); 
          query[paramName] = segments[segments.length - 1];
        }
      }
    }
  }

  if (filePath) {
    try {
      try { delete require.cache[require.resolve(filePath)]; } catch(e) {}
      
      const handler = require(filePath);
      req.query = { ...query, ...req.query };

      await handler(req, res);
      console.log(`[Netlify Bridge Success] Handled ${apiPath}`);
    } catch (err) {
      console.error(`[Netlify Bridge Error] Handler failed: ${err.message}`, err.stack);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error', details: err.message, path: apiPath });
      }
    }
  } else {
    console.warn(`[Netlify Bridge] 404 - No match for ${apiPath}`);
    res.status(404).json({ error: 'Endpoint not found', path: apiPath });
  }
});

module.exports.handler = serverless(app, {
  request: function (req, event, context) {
    req.apiGateway = { event, context };
  }
});
