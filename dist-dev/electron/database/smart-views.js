"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smartViewQueries = void 0;
exports.parseSmartViewRow = parseSmartViewRow;
exports.seedSystemSmartViews = seedSystemSmartViews;
const db_connection_1 = require("./db-connection");
exports.smartViewQueries = {
    getAll() {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM smart_views ORDER BY isSystem DESC, name");
        const rows = stmt.all();
        return rows.map(parseSmartViewRow);
    },
    getSystemViews() {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM smart_views WHERE isSystem = 1 ORDER BY name");
        const rows = stmt.all();
        return rows.map(parseSmartViewRow);
    },
    getById(id) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM smart_views WHERE id = ?");
        const row = stmt.get(id);
        return row ? parseSmartViewRow(row) : null;
    },
    update(id, updates) {
        const current = exports.smartViewQueries.getById(id);
        if (!current) {
            throw new Error(`SmartView not found: ${id}`);
        }
        const merged = { ...current, ...updates };
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      UPDATE smart_views SET
        name = @name,
        icon = @icon,
        filter = @filter,
        sortBy = @sortBy,
        isSystem = @isSystem
      WHERE id = @id
    `);
        stmt.run({
            id: merged.id,
            name: merged.name,
            icon: merged.icon,
            filter: JSON.stringify(merged.filter),
            sortBy: merged.sortBy,
            isSystem: merged.isSystem ? 1 : 0,
        });
    },
};
function parseSmartViewRow(row) {
    return {
        id: row.id,
        name: row.name,
        icon: row.icon,
        filter: JSON.parse(row.filter),
        sortBy: row.sortBy,
        isSystem: row.isSystem === 1,
    };
}
function seedSystemSmartViews() {
    const db = (0, db_connection_1.getDatabase)();
    const existingCount = db
        .prepare("SELECT COUNT(*) as count FROM smart_views WHERE isSystem = 1")
        .get().count;
    if (existingCount > 0) {
        return;
    }
    console.log("[Database] Seeding system smart views...");
    const systemViews = [
        {
            id: "system-inbox",
            name: "Inbox",
            icon: "inbox",
            filter: JSON.stringify({ status: ["inbox"] }),
            sortBy: "createdAt",
            isSystem: 1,
        },
        {
            id: "system-today",
            name: "Today",
            icon: "calendar",
            filter: JSON.stringify({}),
            sortBy: "dueDate",
            isSystem: 1,
        },
        {
            id: "system-queue",
            name: "Queue",
            icon: "list",
            filter: JSON.stringify({ status: ["processed"] }),
            sortBy: "processedAt",
            isSystem: 1,
        },
        {
            id: "system-notebook",
            name: "Notebook",
            icon: "book-open",
            filter: JSON.stringify({ status: ["curated"] }),
            sortBy: "updatedAt",
            isSystem: 1,
        },
        {
            id: "system-topics",
            name: "Topics",
            icon: "tags",
            filter: JSON.stringify({}),
            sortBy: "canonicalName",
            isSystem: 1,
        },
        {
            id: "system-stats",
            name: "Stats",
            icon: "bar-chart-3",
            filter: JSON.stringify({}),
            sortBy: "createdAt",
            isSystem: 1,
        },
        {
            id: "system-weak-topics",
            name: "Weak Topics",
            icon: "alert-triangle",
            filter: JSON.stringify({}),
            sortBy: "difficulty",
            isSystem: 1,
        },
    ];
    const stmt = db.prepare(`
    INSERT INTO smart_views (id, name, icon, filter, sortBy, isSystem)
    VALUES (@id, @name, @icon, @filter, @sortBy, @isSystem)
  `);
    for (const view of systemViews) {
        stmt.run(view);
    }
    console.log(`[Database] Seeded ${systemViews.length} system smart views`);
}
