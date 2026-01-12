import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";
import { getDatabase } from "./db-connection";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ReferenceRange {
  id?: number;
  category: string;
  test_name: string;
  normal_range: string;
  units: string | null;
  si_range: string | null;
  notes: string | null;
  source: string;
}

export const referenceRangeQueries = {
  getAll(): ReferenceRange[] {
    const stmt = getDatabase().prepare("SELECT * FROM reference_ranges ORDER BY category, test_name");
    return stmt.all() as ReferenceRange[];
  },

  getByCategory(category: string): ReferenceRange[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM reference_ranges WHERE category = ? ORDER BY test_name"
    );
    return stmt.all(category) as ReferenceRange[];
  },

  search(query: string): ReferenceRange[] {
    if (!query || query.trim() === "") {
      return this.getAll();
    }

    // Use FTS5 for fast full-text search
    const stmt = getDatabase().prepare(`
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

    return stmt.all(ftsQuery) as ReferenceRange[];
  },

  insert(range: Omit<ReferenceRange, "id">): void {
    const stmt = getDatabase().prepare(`
      INSERT INTO reference_ranges (category, test_name, normal_range, units, si_range, notes, source)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      range.category,
      range.test_name,
      range.normal_range,
      range.units,
      range.si_range,
      range.notes,
      range.source || "MKSAP19"
    );
    invalidateReferenceRangeCache();
  },

  bulkInsert(ranges: Omit<ReferenceRange, "id">[]): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO reference_ranges (category, test_name, normal_range, units, si_range, notes, source)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((items: Omit<ReferenceRange, "id">[]) => {
      for (const item of items) {
        stmt.run(
          item.category,
          item.test_name,
          item.normal_range,
          item.units,
          item.si_range,
          item.notes,
          item.source || "MKSAP19"
        );
      }
    });
    insertMany(ranges);
    invalidateReferenceRangeCache();
  },

  clear(): void {
    getDatabase().exec("DELETE FROM reference_ranges");
    invalidateReferenceRangeCache();
  },

  getCategories(): string[] {
    const stmt = getDatabase().prepare(`
      SELECT DISTINCT category FROM reference_ranges ORDER BY category
    `);
    return (stmt.all() as { category: string }[]).map((row) => row.category);
  },
};

let referenceRangeCache: Map<string, ReferenceRange[]> | null = null;

export function getReferenceRangeCache(): Map<string, ReferenceRange[]> {
  if (referenceRangeCache) return referenceRangeCache;

  const all = referenceRangeQueries.getAll();
  const cache = new Map<string, ReferenceRange[]>();

  for (const range of all) {
    const key = range.test_name.toLowerCase();
    if (!cache.has(key)) {
      cache.set(key, []);
    }
    cache.get(key)!.push(range);
  }

  referenceRangeCache = cache;
  return cache;
}

export function invalidateReferenceRangeCache(): void {
  referenceRangeCache = null;
}

export function seedReferenceRangesFromLocalFile(): void {
  const db = getDatabase();
  const count = db
    .prepare("SELECT COUNT(*) as count FROM reference_ranges")
    .get() as { count: number };

  if (count.count > 0) {
    console.log("[Database] Reference ranges already seeded, skipping");
    return;
  }

  console.log("[Database] Seeding reference ranges...");

  let loadedRanges: Omit<ReferenceRange, "id">[] = [];

  try {
    // Load from compiled location (dist-electron)
    const dataPath = path.join(__dirname, "../../src/data/reference-ranges.json");
    const rawData = fs.readFileSync(dataPath, "utf-8");
    loadedRanges = JSON.parse(rawData);
  } catch (error) {
    console.error("[Database] Failed to load reference ranges from dist-electron:", error);

    try {
      // Fallback: Load from source location (development)
      const sourcePath = path.join(
        process.cwd(),
        "src/data/reference-ranges.json"
      );
      const rawData = fs.readFileSync(sourcePath, "utf-8");
      loadedRanges = JSON.parse(rawData);
    } catch (fallbackError) {
      console.error(
        "[Database] Failed to seed reference ranges (both locations failed):",
        fallbackError
      );
      return;
    }
  }

  if (!Array.isArray(loadedRanges) || loadedRanges.length === 0) {
    console.error("[Database] No reference ranges found in JSON file");
    return;
  }

  referenceRangeQueries.bulkInsert(loadedRanges);
  console.log(`[Database] Seeded ${loadedRanges.length} reference ranges successfully`);
}
