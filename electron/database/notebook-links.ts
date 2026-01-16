import { randomUUID } from "node:crypto";
import { getDatabase } from "./db-connection";
import { DbNotebookLink, NotebookLinkRow, NotebookLinkType } from "./types";

/**
 * Parse a raw database row into a DbNotebookLink object
 */
export function parseNotebookLinkRow(row: NotebookLinkRow): DbNotebookLink {
  return {
    id: row.id,
    sourceBlockId: row.sourceBlockId,
    targetBlockId: row.targetBlockId,
    linkType: row.linkType as NotebookLinkType,
    reason: row.reason ?? undefined,
    anchorText: row.anchorText ?? undefined,
    anchorStart: row.anchorStart ?? undefined,
    anchorEnd: row.anchorEnd ?? undefined,
    createdAt: row.createdAt,
  };
}

export const notebookLinkQueries = {
  /**
   * Create a new notebook link. Returns the created link.
   * Throws if sourceBlockId === targetBlockId (self-link).
   * On UNIQUE conflict, returns the existing link instead.
   */
  create(link: Omit<DbNotebookLink, "id" | "createdAt">): DbNotebookLink {
    if (link.sourceBlockId === link.targetBlockId) {
      throw new Error("Cannot create self-link: sourceBlockId equals targetBlockId");
    }

    const db = getDatabase();
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    // Check for existing link first (UNIQUE constraint)
    const existing = db.prepare<[string, string], NotebookLinkRow>(
      `SELECT * FROM notebook_links WHERE sourceBlockId = ? AND targetBlockId = ?`
    ).get(link.sourceBlockId, link.targetBlockId);

    if (existing) {
      return parseNotebookLinkRow(existing);
    }

    db.prepare(`
      INSERT INTO notebook_links (id, sourceBlockId, targetBlockId, linkType, reason, anchorText, anchorStart, anchorEnd, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      link.sourceBlockId,
      link.targetBlockId,
      link.linkType,
      link.reason ?? null,
      link.anchorText ?? null,
      link.anchorStart ?? null,
      link.anchorEnd ?? null,
      createdAt
    );

    return { id, createdAt, ...link };
  },

  /**
   * Get all links originating FROM a specific block
   */
  getBySourceBlock(blockId: string): DbNotebookLink[] {
    const db = getDatabase();
    const rows = db.prepare<[string], NotebookLinkRow>(
      `SELECT * FROM notebook_links WHERE sourceBlockId = ?`
    ).all(blockId);

    return rows.map(parseNotebookLinkRow);
  },

  /**
   * Get all links pointing TO a specific block (backlinks)
   */
  getByTargetBlock(blockId: string): DbNotebookLink[] {
    const db = getDatabase();
    const rows = db.prepare<[string], NotebookLinkRow>(
      `SELECT * FROM notebook_links WHERE targetBlockId = ?`
    ).all(blockId);

    return rows.map(parseNotebookLinkRow);
  },

  /**
   * Delete a link by ID. Returns true if deleted, false if not found.
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const result = db.prepare(`DELETE FROM notebook_links WHERE id = ?`).run(id);
    return result.changes > 0;
  },
};
