// server.js

const express = require('express');
const path = require('path');
const fs = require('fs');
const { deduplicate } = require('./deduplicate');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from "public" for the front-end
app.use(express.static(path.join(__dirname, 'public')));

// 1) Existing route: /api/images
//    Returns a list of all images in the "images" folder for quicksort logic.
app.get('/api/images', (req, res) => {
  const imagesDir = path.join(__dirname, 'images');
  const fileList = [];

  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else {
        // Build a relative path for the front-end
        const relPath = path.relative(imagesDir, fullPath).replace(/\\/g, '/');
        fileList.push('/images/' + relPath);
      }
    }
  }

  walkDir(imagesDir);
  res.json(fileList);
});

// 2) NEW route: /api/deduplicate
//    POST request that triggers the deduplicate process.
app.post('/api/deduplicate', async (req, res) => {
  try {
    const result = await deduplicate();
    // result: { totalImages, groupsFound, duplicatesRemoved }
    res.json(result);
  } catch (err) {
    console.error('Error deduplicating:', err);
    res.status(500).json({ error: err.toString() });
  }
});

// Serve images statically at /images
app.use('/images', express.static(path.join(__dirname, 'images')));

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
