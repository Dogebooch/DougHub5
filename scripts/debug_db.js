const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// Try to find the DB path
// User provided path: C:\Users\drumm
const userHome = process.env.USERPROFILE || "C:\\Users\\drumm";
const appName = "DougHub"; // I will verify this from package.json
const dbPath = path.join(userHome, "AppData", "Roaming", appName, "doughub.db");

console.log("Checking DB at:", dbPath);

if (!fs.existsSync(dbPath)) {
  console.error("Database file not found!");
  process.exit(1);
}

const db = new Database(dbPath, { readonly: true });

try {
  console.log("\n--- Status Counts ---");
  const counts = db
    .prepare(
      "SELECT status, COUNT(*) as count FROM source_items GROUP BY status",
    )
    .all();
  console.table(counts);

  console.log("\n--- Inbox Items (Top 5) ---");
  const inboxItems = db
    .prepare(
      'SELECT id, title, status, createdAt FROM source_items WHERE status = "inbox" LIMIT 5',
    )
    .all();
  console.table(inboxItems);

  console.log("\n--- Recent Items (Top 5) ---");
  const recentItems = db
    .prepare(
      "SELECT id, title, status, createdAt FROM source_items ORDER BY createdAt DESC LIMIT 5",
    )
    .all();
  console.table(recentItems);
} catch (err) {
  console.error("Error querying database:", err);
} finally {
  db.close();
}
