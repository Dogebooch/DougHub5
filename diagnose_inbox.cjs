/**
 * Diagnostic script to analyze inbox items status and find missing data.
 * Run with: node diagnose_inbox.cjs
 */
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const os = require("os");

const roamingDir = path.join(os.homedir(), "AppData", "Roaming");
const doughubDir = path.join(roamingDir, "doughub");
const dbPath = path.join(doughubDir, "doughub.db");

console.log("=".repeat(60));
console.log("DougHub Inbox Diagnostic");
console.log("=".repeat(60));
console.log("\nDatabase Path:", dbPath);

if (!fs.existsSync(dbPath)) {
  console.error("ERROR: Database not found at", dbPath);
  process.exit(1);
}

try {
  const db = new Database(dbPath, { readonly: true });

  // Schema version
  const version = db.pragma("user_version", { simple: true });
  console.log("Schema Version:", version);

  // Count by status
  console.log("\n--- Item Counts by Status ---");
  const statusCounts = db
    .prepare(
      `
    SELECT status, COUNT(*) as count
    FROM source_items
    GROUP BY status
  `,
    )
    .all();
  statusCounts.forEach((row) => {
    console.log(`  ${row.status}: ${row.count}`);
  });

  // Total items
  const total = db
    .prepare("SELECT COUNT(*) as count FROM source_items")
    .get().count;
  console.log(`  TOTAL: ${total}`);

  // Recent inbox items
  console.log("\n--- Current Inbox Items ---");
  const inboxItems = db
    .prepare(
      `
    SELECT id, title, sourceType, createdAt, updatedAt
    FROM source_items
    WHERE status = 'inbox'
    ORDER BY createdAt DESC
    LIMIT 15
  `,
    )
    .all();

  if (inboxItems.length === 0) {
    console.log("  (No inbox items found)");
  } else {
    inboxItems.forEach((item, i) => {
      const title = item.title?.substring(0, 50) || "(no title)";
      console.log(`  ${i + 1}. [${item.sourceType}] ${title}`);
      console.log(`     Created: ${item.createdAt}`);
      if (item.updatedAt) console.log(`     Updated: ${item.updatedAt}`);
    });
  }

  // Items that recently moved OUT of inbox (most recent curated items)
  console.log("\n--- Recently Curated Items (may have been in inbox) ---");
  const curatedItems = db
    .prepare(
      `
    SELECT id, title, sourceType, createdAt, updatedAt
    FROM source_items
    WHERE status = 'curated'
    ORDER BY updatedAt DESC
    LIMIT 10
  `,
    )
    .all();

  if (curatedItems.length === 0) {
    console.log("  (No curated items found)");
  } else {
    curatedItems.forEach((item, i) => {
      const title = item.title?.substring(0, 50) || "(no title)";
      console.log(`  ${i + 1}. [${item.sourceType}] ${title}`);
      console.log(`     Created: ${item.createdAt}`);
      console.log(`     Updated: ${item.updatedAt || "N/A"}`);
    });
  }

  // Items created in last 7 days
  console.log("\n--- Items Created in Last 7 Days ---");
  const recentItems = db
    .prepare(
      `
    SELECT status, COUNT(*) as count
    FROM source_items
    WHERE createdAt >= datetime('now', '-7 days')
    GROUP BY status
  `,
    )
    .all();

  if (recentItems.length === 0) {
    console.log("  (No items created in last 7 days)");
  } else {
    recentItems.forEach((row) => {
      console.log(`  ${row.status}: ${row.count}`);
    });
  }

  // Items created today
  console.log("\n--- Items Created Today ---");
  const todayItems = db
    .prepare(
      `
    SELECT id, title, status, sourceType, createdAt
    FROM source_items
    WHERE date(createdAt) = date('now')
    ORDER BY createdAt DESC
  `,
    )
    .all();

  if (todayItems.length === 0) {
    console.log("  (No items created today)");
  } else {
    todayItems.forEach((item, i) => {
      const title = item.title?.substring(0, 40) || "(no title)";
      console.log(`  ${i + 1}. [${item.status}] ${title}`);
      console.log(`     Type: ${item.sourceType}, Created: ${item.createdAt}`);
    });
  }

  db.close();
  console.log("\n" + "=".repeat(60));
  console.log("Diagnostic complete.");
} catch (error) {
  console.error("Error:", error.message);
  console.error(error.stack);
  process.exit(1);
}
