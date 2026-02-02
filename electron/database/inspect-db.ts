/**
 * Database inspection script
 * Run with: npx tsx electron/database/inspect-db.ts
 */

import Database from "better-sqlite3";
import path from "path";

// Database path (from app.getPath('userData'))
const dbPath = path.join(process.env.APPDATA!, "doughub", "doughub.db");

console.log("=".repeat(60));
console.log("DougHub Database Inspection");
console.log("Database:", dbPath);
console.log("=".repeat(60));

try {
  const db = new Database(dbPath);

  // Get all tables
  const tables = db
    .prepare(
      `
    SELECT name FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `,
    )
    .all() as { name: string }[];

  console.log("\n📊 TABLES:");
  for (const table of tables) {
    const count = db
      .prepare(`SELECT COUNT(*) as cnt FROM "${table.name}"`)
      .get() as { cnt: number };
    console.log(`  - ${table.name}: ${count.cnt} rows`);
  }

  // Check knowledge_entities
  console.log("\n📚 KNOWLEDGE ENTITIES:");
  const entities = db
    .prepare(
      `
    SELECT id, entityType, title, goldenTicketField, goldenTicketValue, createdAt
    FROM knowledge_entities
    ORDER BY createdAt DESC
    LIMIT 10
  `,
    )
    .all() as {
    id: string;
    entityType: string;
    title: string;
    goldenTicketField: string;
    goldenTicketValue: string;
    createdAt: string;
  }[];

  if (entities.length === 0) {
    console.log("  (No entities found)");
  } else {
    for (const e of entities) {
      console.log(`  [${e.entityType}] ${e.title}`);
      console.log(
        `    Golden Ticket: ${e.goldenTicketField} = ${e.goldenTicketValue?.substring(0, 50)}...`,
      );
    }
  }

  // Check practice_bank_flashcards
  console.log("\n🎴 PRACTICE BANK FLASHCARDS:");
  const cards = db
    .prepare(
      `
    SELECT id, entityId, cardType, isGoldenTicket, isActive, maturityState, dueDate, front
    FROM practice_bank_flashcards
    ORDER BY createdAt DESC
    LIMIT 20
  `,
    )
    .all() as {
    id: string;
    entityId: string;
    cardType: string;
    isGoldenTicket: number;
    isActive: number;
    maturityState: string;
    dueDate: string | null;
    front: string;
  }[];

  if (cards.length === 0) {
    console.log("  (No flashcards found)");
  } else {
    const golden = cards.filter((c) => c.isGoldenTicket);
    const banked = cards.filter((c) => !c.isGoldenTicket);
    const active = cards.filter((c) => c.isActive);
    const due = cards.filter((c) => c.dueDate);

    console.log(`  Total: ${cards.length} cards`);
    console.log(`  Golden Tickets: ${golden.length}`);
    console.log(`  Practice Bank: ${banked.length}`);
    console.log(`  Active: ${active.length}`);
    console.log(`  With due date: ${due.length}`);

    console.log("\n  Sample cards:");
    for (const c of cards.slice(0, 5)) {
      const status = c.isGoldenTicket ? "🎫" : "📚";
      const activeStatus = c.isActive ? "✅" : "⏸️";
      console.log(
        `  ${status}${activeStatus} [${c.cardType}] ${c.maturityState}`,
      );
      console.log(`      Front: ${c.front?.substring(0, 60)}...`);
    }
  }

  // Check source_items (Inbox)
  console.log("\n📥 SOURCE ITEMS (INBOX):");
  const sources = db
    .prepare(
      `
    SELECT id, sourceType, title, status, createdAt
    FROM source_items
    ORDER BY createdAt DESC
    LIMIT 5
  `,
    )
    .all() as {
    id: string;
    sourceType: string;
    title: string;
    status: string;
    createdAt: string;
  }[];

  if (sources.length === 0) {
    console.log("  (No source items found)");
  } else {
    for (const s of sources) {
      console.log(`  [${s.sourceType}] ${s.title} - ${s.status}`);
    }
  }

  db.close();
  console.log("\n✅ Inspection complete");
} catch (error: unknown) {
  console.error("❌ Error:", (error as Error).message);
}
