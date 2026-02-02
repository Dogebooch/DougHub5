"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsQueries = void 0;
const db_connection_1 = require("./db-connection");
exports.settingsQueries = {
    get(key) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT value FROM settings WHERE key = ?");
        const row = stmt.get(key);
        return row?.value ?? null;
    },
    getParsed(key, defaultValue) {
        const value = this.get(key);
        if (!value)
            return defaultValue;
        try {
            return JSON.parse(value);
        }
        catch (e) {
            console.error(`[Settings] Failed to parse JSON for key "${key}":`, e);
            return defaultValue;
        }
    },
    set(key, value) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      INSERT INTO settings (key, value, updatedAt) 
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
    `);
        const now = new Date().toISOString();
        stmt.run(key, value, now);
    },
    increment(key) {
        const db = (0, db_connection_1.getDatabase)();
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
        const result = stmt.get(now, key);
        if (!result) {
            this.set(key, "1");
            return 1;
        }
        return parseInt(result.value, 10);
    },
    getAll() {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT key, value FROM settings");
        return stmt.all();
    },
};
