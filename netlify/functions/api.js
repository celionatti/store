const express = require("express");
const serverless = require("serverless-http");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.json());

// Mock Vercel serverless environment logic (similar to api-server.cjs)
app.all("/api/*", async (req, res) => {
  const apiPath = req.path.replace(/^\/api/, "");

  let filePath = null;
  let query = { ...req.query };

  // Use process.cwd() as it points to the root of the project during Netlify function execution if included_files is used correctly
  // Or use __dirname if it's more reliable in the bundled environment.
  // In Netlify, included_files are placed relative to the base directory.
  const apiFolder = path.join(process.cwd(), "api");
  const fullPath = path.join(apiFolder, apiPath);

  if (fs.existsSync(fullPath + ".js")) {
    filePath = fullPath + ".js";
  } else if (fs.existsSync(path.join(fullPath, "index.js"))) {
    filePath = path.join(fullPath, "index.js");
  } else {
    // Dynamic route matching (naive [id] matching)
    const segments = apiPath.split("/").filter(Boolean);
    if (segments.length > 0) {
      const parentDir = path.join(apiFolder, ...segments.slice(0, -1));
      if (fs.existsSync(parentDir)) {
        const files = fs.readdirSync(parentDir);
        const dynamicFile = files.find(
          (f) => f.startsWith("[") && f.endsWith("].js"),
        );
        if (dynamicFile) {
          filePath = path.join(parentDir, dynamicFile);
          const paramName = dynamicFile.slice(1, -4); // [id] -> id
          query[paramName] = segments[segments.length - 1];
        }
      }
    }
  }

  if (filePath) {
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
      };

      await handler(vReq, vRes);
    } catch (err) {
      console.error(`[API Error] ${err.message}`);
      res
        .status(500)
        .json({ error: "Internal Server Error", details: err.message });
    }
  } else {
    res.status(404).json({ error: "Endpoint not found" });
  }
});

module.exports.handler = serverless(app);
