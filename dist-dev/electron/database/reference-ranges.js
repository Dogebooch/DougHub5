"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.referenceRangeQueries = void 0;
exports.getReferenceRangeCache = getReferenceRangeCache;
exports.invalidateReferenceRangeCache = invalidateReferenceRangeCache;
exports.seedReferenceRangesFromLocalFile = seedReferenceRangesFromLocalFile;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_connection_1 = require("./db-connection");
exports.referenceRangeQueries = {
    getAll() {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM reference_ranges ORDER BY category, test_name");
        return stmt.all();
    },
    getByCategory(category) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM reference_ranges WHERE category = ? ORDER BY test_name");
        return stmt.all(category);
    },
    search(query) {
        if (!query || query.trim() === "") {
            return this.getAll();
        }
        // Use FTS5 for fast full-text search
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      SELECT r.*
      FROM reference_ranges_fts fts
      INNER JOIN reference_ranges r ON r.id = fts.rowid
      WHERE reference_ranges_fts MATCH ?
      ORDER BY rank, r.category, r.test_name
      LIMIT 50
    `);
        // FTS5 search query: match any word in test_name, category, or normal_range
        const ftsQuery = query
            .trim()
            .split(/\s+/)
            .map((word) => `"${word.replace(/"/g, '""')}"*`)
            .join(" OR ");
        return stmt.all(ftsQuery);
    },
    insert(range) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      INSERT INTO reference_ranges (category, test_name, normal_range, units, si_range, notes, source)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(range.category, range.test_name, range.normal_range, range.units, range.si_range, range.notes, range.source || "MKSAP19");
        invalidateReferenceRangeCache();
    },
    bulkInsert(ranges) {
        const db = (0, db_connection_1.getDatabase)();
        const stmt = db.prepare(`
      INSERT INTO reference_ranges (category, test_name, normal_range, units, si_range, notes, source)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        const insertMany = db.transaction((items) => {
            for (const item of items) {
                stmt.run(item.category, item.test_name, item.normal_range, item.units, item.si_range, item.notes, item.source || "MKSAP19");
            }
        });
        insertMany(ranges);
        invalidateReferenceRangeCache();
    },
    clear() {
        (0, db_connection_1.getDatabase)().exec("DELETE FROM reference_ranges");
        invalidateReferenceRangeCache();
    },
    getCategories() {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      SELECT DISTINCT category FROM reference_ranges ORDER BY category
    `);
        return stmt.all().map((row) => row.category);
    },
};
let referenceRangeCache = null;
function getReferenceRangeCache() {
    if (referenceRangeCache)
        return referenceRangeCache;
    const all = exports.referenceRangeQueries.getAll();
    const cache = new Map();
    for (const range of all) {
        const key = range.test_name.toLowerCase();
        if (!cache.has(key)) {
            cache.set(key, []);
        }
        cache.get(key).push(range);
    }
    referenceRangeCache = cache;
    return cache;
}
function invalidateReferenceRangeCache() {
    referenceRangeCache = null;
}
function seedReferenceRangesFromLocalFile() {
    const db = (0, db_connection_1.getDatabase)();
    const count = db
        .prepare("SELECT COUNT(*) as count FROM reference_ranges")
        .get();
    if (count.count > 0) {
        console.log("[Database] Reference ranges already seeded, skipping");
        return;
    }
    console.log("[Database] Seeding reference ranges...");
    let loadedRanges = [];
    const scriptDir = __dirname;
    try {
        // Load from compiled location (dist-electron)
        const dataPath = path_1.default.join(scriptDir, "../../src/data/reference-ranges.json");
        const rawData = fs_1.default.readFileSync(dataPath, "utf-8");
        loadedRanges = JSON.parse(rawData);
    }
    catch (error) {
        console.error("[Database] Failed to load reference ranges from dist-electron:", error);
        try {
            // Fallback: Load from source location (development)
            const sourcePath = path_1.default.join(process.cwd(), "src/data/reference-ranges.json");
            const rawData = fs_1.default.readFileSync(sourcePath, "utf-8");
            loadedRanges = JSON.parse(rawData);
        }
        catch (fallbackError) {
            console.error("[Database] Failed to seed reference ranges (both locations failed):", fallbackError);
            return;
        }
    }
    if (!Array.isArray(loadedRanges) || loadedRanges.length === 0) {
        console.error("[Database] No reference ranges found in JSON file");
        return;
    }
    exports.referenceRangeQueries.bulkInsert(loadedRanges);
    console.log(`[Database] Seeded ${loadedRanges.length} reference ranges successfully`);
}
