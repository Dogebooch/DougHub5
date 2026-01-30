
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const roamingDir = path.join(os.homedir(), 'AppData', 'Roaming', 'doughub');
const dbPath = path.join(roamingDir, 'database.sqlite');
console.log('Inspecting potential legacy DB:', dbPath);

try {
  const db = new Database(dbPath, { readonly: true });
  
  // Check tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
  console.log('Tables:', tables);
  
  if (tables.includes('source_items')) {
      const count = db.prepare("SELECT COUNT(*) as count FROM source_items WHERE status = 'inbox'").get().count;
      console.log(`Inbox Items (source_items): ${count}`);
      
      if (count > 0) {
          const items = db.prepare("SELECT title, createdAt FROM source_items WHERE status = 'inbox'").all();
          items.forEach(item => console.log(`   - ${item.title} (${item.createdAt})`));
      }
  } else {
      console.log("Table 'source_items' NOT found in legacy DB.");
  }
  
  db.close();
} catch (e) {
  console.error('Error reading DB:', e.message);
}
