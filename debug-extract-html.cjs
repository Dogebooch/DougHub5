
const Database = require('better-sqlite3');
const zlib = require('zlib');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(process.env.APPDATA, 'doughub---template-react-ts', 'doughub.db');
console.log(`[DEBUG] Opening database at: ${dbPath}`);

const db = new Database(dbPath, { readonly: true });

try {
  // Get latest source item
  const latestItem = db.prepare('SELECT * FROM source_items ORDER BY createdAt DESC LIMIT 1').get();
  
  if (!latestItem) {
    console.error('[DEBUG] No source items found.');
    process.exit(1);
  }
  
  console.log(`[DEBUG] Found latest item: ${latestItem.id} (${latestItem.title})`);
  
  // Get raw page
  const rawPage = db.prepare('SELECT htmlPayload FROM source_raw_pages WHERE sourceItemId = ?').get(latestItem.id);
  
  if (!rawPage) {
    console.error(`[DEBUG] No raw page found for item ${latestItem.id}.`);
    process.exit(1);
  }
  
  // Decompress
  const buffer = rawPage.htmlPayload;
  let html = '';
  try {
    html = zlib.gunzipSync(buffer).toString('utf-8');
  } catch (err) {
    console.error('[DEBUG] Gunzip failed, trying plain text fallback...');
    html = buffer.toString('utf-8');
  }
  
  const outputPath = path.join(__dirname, 'debug_extracted.html');
  fs.writeFileSync(outputPath, html);
  console.log(`[DEBUG] Successfully extracted HTML to: ${outputPath}`);
  
} catch (error) {
  console.error('[DEBUG] Error:', error);
} finally {
  db.close();
}
