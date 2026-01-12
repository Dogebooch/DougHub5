import { getDatabase, setSchemaVersion } from "../db-connection";

export function migrateToV8(dbPath: string): void {
  console.log(
    "[Migration] Starting migration to schema version 8 (Card difficulty index)..."
  );

  void dbPath;

  const database = getDatabase();

  try {
    database.transaction(() => {
      database.exec(
        "CREATE INDEX IF NOT EXISTS idx_cards_difficulty ON cards(difficulty)"
      );
      setSchemaVersion(8);
    })();

    console.log("[Migration] Successfully migrated to schema version 8");
  } catch (error) {
    console.error("[Migration] Failed to migrate to schema version 8:", error);
    throw error;
  }
}
