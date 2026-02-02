"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notebookTopicPageQueries = void 0;
exports.getTopicsWithStats = getTopicsWithStats;
exports.parseNotebookTopicPageRow = parseNotebookTopicPageRow;
const db_connection_1 = require("./db-connection");
exports.notebookTopicPageQueries = {
    getAll() {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM notebook_topic_pages ORDER BY updatedAt DESC");
        const rows = stmt.all();
        return rows.map(parseNotebookTopicPageRow);
    },
    getById(id) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM notebook_topic_pages WHERE id = ?");
        const row = stmt.get(id);
        return row ? parseNotebookTopicPageRow(row) : null;
    },
    getByCanonicalTopicId(canonicalTopicId) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM notebook_topic_pages WHERE canonicalTopicId = ?");
        const row = stmt.get(canonicalTopicId);
        return row ? parseNotebookTopicPageRow(row) : null;
    },
    insert(page) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      INSERT INTO notebook_topic_pages (id, canonicalTopicId, cardIds, createdAt, updatedAt)
      VALUES (@id, @canonicalTopicId, @cardIds, @createdAt, @updatedAt)
    `);
        stmt.run({
            ...page,
            cardIds: JSON.stringify(page.cardIds),
        });
    },
    update(id, updates) {
        const current = exports.notebookTopicPageQueries.getById(id);
        if (!current) {
            throw new Error(`NotebookTopicPage not found: ${id}`);
        }
        const merged = { ...current, ...updates };
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      UPDATE notebook_topic_pages SET
        canonicalTopicId = @canonicalTopicId,
        cardIds = @cardIds,
        createdAt = @createdAt,
        updatedAt = @updatedAt
      WHERE id = @id
    `);
        stmt.run({
            ...merged,
            cardIds: JSON.stringify(merged.cardIds),
        });
    },
    delete(id) {
        const db = (0, db_connection_1.getDatabase)();
        db.transaction(() => {
            db.prepare(`
        DELETE FROM review_logs 
        WHERE cardId IN (SELECT id FROM cards WHERE notebookTopicPageId = ?)
      `).run(id);
            db.prepare("DELETE FROM cards WHERE notebookTopicPageId = ?").run(id);
            const sourceItems = db
                .prepare(`
        SELECT DISTINCT sourceItemId FROM notebook_blocks WHERE notebookTopicPageId = ?
      `)
                .all(id);
            db.prepare("DELETE FROM notebook_blocks WHERE notebookTopicPageId = ?").run(id);
            const checkStmt = db.prepare("SELECT COUNT(*) as count FROM notebook_blocks WHERE sourceItemId = ?");
            const updateStmt = db.prepare("UPDATE source_items SET status = 'processed', updatedAt = ? WHERE id = ? AND status = 'curated'");
            const now = new Date().toISOString();
            for (const item of sourceItems) {
                if (item.sourceItemId) {
                    const result = checkStmt.get(item.sourceItemId);
                    if (result.count === 0) {
                        updateStmt.run(now, item.sourceItemId);
                    }
                }
            }
            db.prepare("DELETE FROM notebook_topic_pages WHERE id = ?").run(id);
        })();
    },
    getTopicsWithStats() {
        const db = (0, db_connection_1.getDatabase)();
        const sql = `
      SELECT 
        ntp.id,
        ct.canonicalName as title,
        ntp.canonicalTopicId,
        ntp.updatedAt,
        ct.canonicalName,
        ct.domain,
        ct.aliases,
        COUNT(DISTINCT nb.id) as blockCount,
        COUNT(DISTINCT c.id) as cardCount
      FROM notebook_topic_pages ntp
      LEFT JOIN canonical_topics ct ON ntp.canonicalTopicId = ct.id
      LEFT JOIN notebook_blocks nb ON nb.notebookTopicPageId = ntp.id
      LEFT JOIN cards c ON c.notebookTopicPageId = ntp.id
      GROUP BY ntp.id
      ORDER BY ntp.updatedAt DESC
    `;
        return db.prepare(sql).all();
    },
};
function getTopicsWithStats() {
    return exports.notebookTopicPageQueries.getTopicsWithStats();
}
function parseNotebookTopicPageRow(row) {
    return {
        ...row,
        cardIds: JSON.parse(row.cardIds),
    };
}
