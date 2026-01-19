import { getDatabase, setSchemaVersion } from "../db-connection";

export function migrateToV18(): void {
  console.log("[Migration] Starting migration to schema version 18 (Data Logging Framework)...");
  const database = getDatabase();

  database.transaction(() => {
    // source_items: correctness, notes, testedConcepts
    database.exec(`
      ALTER TABLE source_items ADD COLUMN correctness TEXT;
      ALTER TABLE source_items ADD COLUMN notes TEXT;
      ALTER TABLE source_items ADD COLUMN testedConcepts TEXT;
    `);
    console.log("[Migration] Added correctness, notes, testedConcepts to source_items");

    // cards: targetedConfusion, relevanceScore, relevanceReason
    database.exec(`
      ALTER TABLE cards ADD COLUMN targetedConfusion TEXT;
      ALTER TABLE cards ADD COLUMN relevanceScore TEXT;
      ALTER TABLE cards ADD COLUMN relevanceReason TEXT;
    `);
    console.log("[Migration] Added targetedConfusion, relevanceScore, relevanceReason to cards");

    // review_logs: confidenceRating
    database.exec(`
      ALTER TABLE review_logs ADD COLUMN confidenceRating TEXT;
    `);
    console.log("[Migration] Added confidenceRating to review_logs");

    setSchemaVersion(18);
  })();

  console.log("[Migration] Successfully migrated to schema version 18");
}
