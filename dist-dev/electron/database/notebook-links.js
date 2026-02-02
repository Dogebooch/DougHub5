"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notebookLinkQueries = void 0;
exports.parseNotebookLinkRow = parseNotebookLinkRow;
const node_crypto_1 = require("node:crypto");
const db_connection_1 = require("./db-connection");
/**
 * Parse a raw database row into a DbNotebookLink object
 */
function parseNotebookLinkRow(row) {
    return {
        id: row.id,
        sourceBlockId: row.sourceBlockId,
        targetBlockId: row.targetBlockId,
        linkType: row.linkType,
        reason: row.reason ?? undefined,
        anchorText: row.anchorText ?? undefined,
        anchorStart: row.anchorStart ?? undefined,
        anchorEnd: row.anchorEnd ?? undefined,
        createdAt: row.createdAt,
    };
}
exports.notebookLinkQueries = {
    /**
     * Create a new notebook link. Returns the created link.
     * Throws if sourceBlockId === targetBlockId (self-link).
     * On UNIQUE conflict, returns the existing link instead.
     */
    create(link) {
        if (link.sourceBlockId === link.targetBlockId) {
            throw new Error("Cannot create self-link: sourceBlockId equals targetBlockId");
        }
        const db = (0, db_connection_1.getDatabase)();
        const id = (0, node_crypto_1.randomUUID)();
        const createdAt = new Date().toISOString();
        // Check for existing link first (UNIQUE constraint)
        const existing = db.prepare(`SELECT * FROM notebook_links WHERE sourceBlockId = ? AND targetBlockId = ?`).get(link.sourceBlockId, link.targetBlockId);
        if (existing) {
            return parseNotebookLinkRow(existing);
        }
        db.prepare(`
      INSERT INTO notebook_links (id, sourceBlockId, targetBlockId, linkType, reason, anchorText, anchorStart, anchorEnd, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, link.sourceBlockId, link.targetBlockId, link.linkType, link.reason ?? null, link.anchorText ?? null, link.anchorStart ?? null, link.anchorEnd ?? null, createdAt);
        return { id, createdAt, ...link };
    },
    /**
     * Get all links originating FROM a specific block
     */
    getBySourceBlock(blockId) {
        const db = (0, db_connection_1.getDatabase)();
        const rows = db.prepare(`SELECT * FROM notebook_links WHERE sourceBlockId = ?`).all(blockId);
        return rows.map(parseNotebookLinkRow);
    },
    /**
     * Get all links pointing TO a specific block (backlinks)
     */
    getByTargetBlock(blockId) {
        const db = (0, db_connection_1.getDatabase)();
        const rows = db.prepare(`SELECT * FROM notebook_links WHERE targetBlockId = ?`).all(blockId);
        return rows.map(parseNotebookLinkRow);
    },
    /**
     * Delete a link by ID. Returns true if deleted, false if not found.
     */
    delete(id) {
        const db = (0, db_connection_1.getDatabase)();
        const result = db.prepare(`DELETE FROM notebook_links WHERE id = ?`).run(id);
        return result.changes > 0;
    },
};
