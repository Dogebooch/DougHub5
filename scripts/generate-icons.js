/**
 * Icon Generation Script for DougHub
 *
 * Generates all required icon formats from the source SVG:
 * - Windows: icon.ico (multi-resolution)
 * - macOS: icon.icns (via icon.png at 1024x1024)
 * - Linux: Multiple PNG sizes in build/ folder
 *
 * Usage: node scripts/generate-icons.js
 * Requires: sharp (npm install --save-dev sharp)
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUILD_DIR = path.join(__dirname, '..', 'build');
const SVG_PATH = path.join(BUILD_DIR, 'icon.svg');

// Icon sizes needed for different platforms
const ICON_SIZES = {
  // Linux AppImage expects these sizes in build/ folder
  linux: [16, 32, 48, 64, 128, 256, 512, 1024],
  // Windows .ico contains multiple sizes
  windows: [16, 24, 32, 48, 64, 128, 256],
  // macOS needs 1024x1024 PNG (electron-builder converts to .icns)
  macos: [1024],
};

/**
 * Generate main icon.png for macOS (1024x1024)
 */
async function generateMacIcon() {
  const svgBuffer = fs.readFileSync(SVG_PATH);
  const outputPath = path.join(BUILD_DIR, 'icon.png');

  await sharp(svgBuffer)
    .resize(1024, 1024, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(outputPath);

  console.log('  Generated: icon.png (1024x1024 for macOS)');
}

/**
 * Generate a simple .ico file using raw buffer manipulation
 * This creates a valid ICO with multiple sizes embedded
 */
async function generateIcoFile() {
  const svgBuffer = fs.readFileSync(SVG_PATH);
  const sizes = ICON_SIZES.windows;
  const pngBuffers = [];

  // Generate PNG buffers for each size
  for (const size of sizes) {
    const pngBuffer = await sharp(svgBuffer)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();
    pngBuffers.push({ size, buffer: pngBuffer });
  }

  // ICO file format:
  // - ICONDIR header (6 bytes)
  // - ICONDIRENTRY for each image (16 bytes each)
  // - Image data (PNG format)

  const numImages = pngBuffers.length;
  const headerSize = 6;
  const entrySize = 16;
  const entriesSize = entrySize * numImages;

  // Calculate offsets
  let offset = headerSize + entriesSize;
  const entries = pngBuffers.map(({ size, buffer }) => {
    const entry = {
      width: size === 256 ? 0 : size, // 0 means 256 in ICO format
      height: size === 256 ? 0 : size,
      size: buffer.length,
      offset: offset,
      buffer: buffer
    };
    offset += buffer.length;
    return entry;
  });

  // Create ICO buffer
  const totalSize = headerSize + entriesSize + pngBuffers.reduce((sum, { buffer }) => sum + buffer.length, 0);
  const icoBuffer = Buffer.alloc(totalSize);

  // Write ICONDIR header
  icoBuffer.writeUInt16LE(0, 0);      // Reserved (must be 0)
  icoBuffer.writeUInt16LE(1, 2);      // Type (1 for ICO)
  icoBuffer.writeUInt16LE(numImages, 4); // Number of images

  // Write ICONDIRENTRY for each image
  let entryOffset = headerSize;
  for (const entry of entries) {
    icoBuffer.writeUInt8(entry.width, entryOffset);      // Width
    icoBuffer.writeUInt8(entry.height, entryOffset + 1); // Height
    icoBuffer.writeUInt8(0, entryOffset + 2);            // Color palette
    icoBuffer.writeUInt8(0, entryOffset + 3);            // Reserved
    icoBuffer.writeUInt16LE(1, entryOffset + 4);         // Color planes
    icoBuffer.writeUInt16LE(32, entryOffset + 6);        // Bits per pixel
    icoBuffer.writeUInt32LE(entry.size, entryOffset + 8);   // Image size
    icoBuffer.writeUInt32LE(entry.offset, entryOffset + 12); // Image offset
    entryOffset += entrySize;
  }

  // Write image data
  for (const entry of entries) {
    entry.buffer.copy(icoBuffer, entry.offset);
  }

  // Write ICO file
  const icoPath = path.join(BUILD_DIR, 'icon.ico');
  fs.writeFileSync(icoPath, icoBuffer);
  console.log('  Generated: icon.ico (multi-resolution)');
}

/**
 * Main function
 */
async function main() {
  console.log('DougHub Icon Generator');
  console.log('======================\n');

  // Ensure build directory exists
  if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
    console.log(`Created build directory: ${BUILD_DIR}\n`);
  }

  // Check SVG exists
  if (!fs.existsSync(SVG_PATH)) {
    console.error(`ERROR: Source SVG not found at ${SVG_PATH}`);
    console.error('Please create build/icon.svg before running this script.');
    process.exit(1);
  }

  console.log(`Source: ${SVG_PATH}\n`);

  try {
    const svgBuffer = fs.readFileSync(SVG_PATH);

    // Generate macOS icon
    console.log('Generating macOS icon...');
    await generateMacIcon();

    // Generate Windows .ico
    console.log('\nGenerating Windows icon...');
    await generateIcoFile();

    // Generate Linux PNGs
    console.log('\nGenerating Linux icons...');
    for (const size of ICON_SIZES.linux) {
      const outputPath = path.join(BUILD_DIR, `${size}x${size}.png`);
      await sharp(svgBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      console.log(`  Generated: ${size}x${size}.png`);
    }

    console.log('\n✓ All icons generated successfully!');
    console.log('\nOutput files in build/:');
    console.log('  - icon.png (macOS)');
    console.log('  - icon.ico (Windows)');
    console.log('  - *.png (Linux, various sizes)');

  } catch (error) {
    console.error('ERROR generating icons:', error);
    process.exit(1);
  }
}

main();
