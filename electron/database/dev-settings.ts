import { getDatabase } from "./db-connection";

export const devSettingsQueries = {
  get(key: string): string | null {
    const stmt = getDatabase().prepare(
      "SELECT value FROM dev_settings WHERE key = ?"
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
      console.error(`[DevSettings] Failed to parse JSON for key "${key}":`, e);
      return defaultValue;
    }
  },

  set(key: string, value: string): void {
    const stmt = getDatabase().prepare(`
      INSERT INTO dev_settings (key, value, updatedAt) 
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
    `);
    const now = new Date().toISOString();
    stmt.run(key, value, now);
  },

  getAll(): Record<string, string> {
    const stmt = getDatabase().prepare("SELECT key, value FROM dev_settings");
    const rows = stmt.all() as { key: string; value: string }[];
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  },
};
