"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.devSettingsQueries = void 0;
const db_connection_1 = require("./db-connection");
exports.devSettingsQueries = {
    get(key) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT value FROM dev_settings WHERE key = ?");
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
            console.error(`[DevSettings] Failed to parse JSON for key "${key}":`, e);
            return defaultValue;
        }
    },
    set(key, value) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      INSERT INTO dev_settings (key, value, updatedAt) 
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
    `);
        const now = new Date().toISOString();
        stmt.run(key, value, now);
    },
    getAll() {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT key, value FROM dev_settings");
        const rows = stmt.all();
        const result = {};
        for (const row of rows) {
            result[row.key] = row.value;
        }
        return result;
    },
};
