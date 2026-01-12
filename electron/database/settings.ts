import { getDatabase } from "./db-connection";

export const settingsQueries = {
  get(key: string): string | null {
    const stmt = getDatabase().prepare(
      "SELECT value FROM settings WHERE key = ?"
    );
    const row = stmt.get(key) as { value: string } | undefined;
    return row?.value ?? null;
  },

  getParsed<T>(key: string, defaultValue: T): T {
    const value = this.get(key);
    if (!value) return defaultValue;
    try {
      return JSON.parse(value) as T;
    } catch (e) {
      console.error(`[Settings] Failed to parse JSON for key "${key}":`, e);
      return defaultValue;
    }
  },

  set(key: string, value: string): void {
    const stmt = getDatabase().prepare(`
      INSERT INTO settings (key, value, updatedAt) 
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
    `);
    const now = new Date().toISOString();
    stmt.run(key, value, now);
  },

  increment(key: string): number {
    const db = getDatabase();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      UPDATE settings 
      SET 
        value = CASE 
          WHEN CAST(value AS INTEGER) >= 9007199254740991 THEN '0'
          ELSE CAST(CAST(value AS INTEGER) + 1 AS TEXT)
        END,
        updatedAt = ?
      WHERE key = ?
      RETURNING value
    `);

    const result = stmt.get(now, key) as { value: string } | undefined;
    if (!result) {
      this.set(key, "1");
      return 1;
    }

    return parseInt(result.value, 10);
  },

  getAll(): { key: string; value: string }[] {
    const stmt = getDatabase().prepare("SELECT key, value FROM settings");
    return stmt.all() as { key: string; value: string }[];
  },
};
