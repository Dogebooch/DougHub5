import { getDatabase } from "./db-connection";
import type { DbNotebookTopicPage, NotebookTopicPageRow } from "./types";

export const notebookTopicPageQueries = {
  getAll(): DbNotebookTopicPage[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM notebook_topic_pages ORDER BY updatedAt DESC"
    );
    const rows = stmt.all() as NotebookTopicPageRow[];
    return rows.map(parseNotebookTopicPageRow);
  },

  getById(id: string): DbNotebookTopicPage | null {
    const stmt = getDatabase().prepare(
      "SELECT * FROM notebook_topic_pages WHERE id = ?"
    );
    const row = stmt.get(id) as NotebookTopicPageRow | undefined;
    return row ? parseNotebookTopicPageRow(row) : null;
  },

  insert(page: DbNotebookTopicPage): void {
    const stmt = getDatabase().prepare(`
      INSERT INTO notebook_topic_pages (id, canonicalTopicId, cardIds, createdAt, updatedAt)
      VALUES (@id, @canonicalTopicId, @cardIds, @createdAt, @updatedAt)
    `);
    stmt.run({
      ...page,
      cardIds: JSON.stringify(page.cardIds),
    });
  },

  update(id: string, updates: Partial<DbNotebookTopicPage>): void {
    const current = notebookTopicPageQueries.getById(id);
    if (!current) {
      throw new Error(`NotebookTopicPage not found: ${id}`);
    }

    const merged = { ...current, ...updates };
    const stmt = getDatabase().prepare(`
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

  delete(id: string): void {
    const db = getDatabase();
    db.transaction(() => {
      db.prepare(
        `
        DELETE FROM review_logs 
        WHERE cardId IN (SELECT id FROM cards WHERE notebookTopicPageId = ?)
      `
      ).run(id);

      db.prepare("DELETE FROM cards WHERE notebookTopicPageId = ?").run(id);

      const sourceItems = db
        .prepare(
          `
        SELECT DISTINCT sourceItemId FROM notebook_blocks WHERE notebookTopicPageId = ?
      `
        )
        .all(id) as { sourceItemId: string }[];

      db.prepare(
        "DELETE FROM notebook_blocks WHERE notebookTopicPageId = ?"
      ).run(id);

      const checkStmt = db.prepare(
        "SELECT COUNT(*) as count FROM notebook_blocks WHERE sourceItemId = ?"
      );
      const updateStmt = db.prepare(
        "UPDATE source_items SET status = 'processed', updatedAt = ? WHERE id = ? AND status = 'curated'"
      );
      const now = new Date().toISOString();

      for (const item of sourceItems) {
        if (item.sourceItemId) {
          const result = checkStmt.get(item.sourceItemId) as { count: number };
          if (result.count === 0) {
            updateStmt.run(now, item.sourceItemId);
          }
        }
      }

      db.prepare("DELETE FROM notebook_topic_pages WHERE id = ?").run(id);
    })();
  },
};

export function parseNotebookTopicPageRow(
  row: NotebookTopicPageRow
): DbNotebookTopicPage {
  return {
    ...row,
    cardIds: JSON.parse(row.cardIds),
  };
}
