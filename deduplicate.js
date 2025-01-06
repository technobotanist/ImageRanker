const path = require('path');
const fs = require('fs-extra');
const Jimp = require('jimp');
const sharp = require('sharp');

/**
 * Where your images are located.
 * Adjust if needed, e.g., path.join(__dirname, 'images').
 */
const IMAGES_DIR = path.join(__dirname, 'images');

/**
 * We'll only consider two images "duplicates" if their pHash distance is <= this.
 * Tweak as you see fit. 
 */
const PHASH_THRESHOLD = 5;

/**
 * Example config: keep images at max 2000×2000 in memory
 * to avoid huge allocations in Jimp.
 */
const MAX_WIDTH = 2000;
const MAX_HEIGHT = 2000;

/**
 * Recursively walk the images directory,
 * collecting info on each image.
 */
async function walkDir(dir, allImages) {
  const files = await fs.readdir(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      await walkDir(fullPath, allImages);
    } else {
      const info = await getImageInfo(fullPath);
      if (info) {
        allImages.push(info);
      }
    }
  }
}

/**
 * Reads the original file, downscales it with Sharp in memory,
 * then passes the smaller buffer to Jimp for analysis (hash, etc.).
 */
async function getImageInfo(filePath) {
  try {
    // 1) Use Sharp to read & downscale (if needed) in memory
    //    e.g., keep images at max 2000×2000
    const resizedBuffer = await sharp(filePath)
      .resize({
        width: MAX_WIDTH,
        height: MAX_HEIGHT,
        fit: 'inside',           // maintain aspect ratio, no cropping
        withoutEnlargement: true // don't upscale smaller images
      })
      // optionally convert to a standard format if original might be non-JPEG
      .toFormat('jpeg')
      .toBuffer();

    // 2) Now read the *resized* buffer with Jimp
    let image = await Jimp.read(resizedBuffer);

    // (Optional) auto-crop if you want
    // image = image.autocrop();

    // 3) Extract width/height/resolution from the *cropped/resized* image
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    const resolution = width * height;

    // 4) Compute pHash in hex
    const pHash = image.hash(16);

    return { filePath, pHash, width, height, resolution };

  } catch (err) {
    console.error('Could not read image:', filePath, err);
    return null;
  }
}

/**
 * Compute Hamming distance between two 64-bit hex strings
 * (the pHash from Jimp).
 */
function hammingDistance(hashA, hashB) {
  const valA = BigInt('0x' + hashA);
  const valB = BigInt('0x' + hashB);
  let x = valA ^ valB;
  let dist = 0n;
  while (x > 0) {
    dist += x & 1n;
    x >>= 1n;
  }
  return Number(dist);
}

/**
 * Main deduplicate function:
 * 1. Walk IMAGES_DIR
 * 2. Downscale via Sharp, pHash in Jimp
 * 3. Group near-duplicates by pHash distance <= PHASH_THRESHOLD
 * 4. Keep only highest-res in each group, remove the rest
 * 5. Return summary
 */
async function deduplicate() {
  const allImages = [];
  await walkDir(IMAGES_DIR, allImages);
  const totalImages = allImages.length;

  console.log(`Scanned ${totalImages} images in '${IMAGES_DIR}'.`);

  // Compare images pairwise (O(N^2) approach).
  const visited = new Set();
  const duplicatesGroups = [];

  for (let i = 0; i < allImages.length; i++) {
    if (visited.has(i)) continue;

    const group = [allImages[i]];
    visited.add(i);

    for (let j = i + 1; j < allImages.length; j++) {
      if (visited.has(j)) continue;

      const dist = hammingDistance(allImages[i].pHash, allImages[j].pHash);
      if (dist <= PHASH_THRESHOLD) {
        group.push(allImages[j]);
        visited.add(j);
      }
    }

    if (group.length > 1) {
      duplicatesGroups.push(group);
    }
  }

  let duplicatesRemoved = 0;

  // For each group, keep the highest resolution, remove the others
  for (const group of duplicatesGroups) {
    // sort descending by resolution
    group.sort((a, b) => b.resolution - a.resolution);

    // The first is keeper
    for (let k = 1; k < group.length; k++) {
      const toRemove = group[k];
      console.log(`Removing lower-res duplicate: ${toRemove.filePath}`);
      await fs.remove(toRemove.filePath);
      duplicatesRemoved++;
    }
  }

  return {
    totalImages,
    groupsFound: duplicatesGroups.length,
    duplicatesRemoved
  };
}

module.exports = { deduplicate };
