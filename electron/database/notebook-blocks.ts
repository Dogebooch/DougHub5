import { getDatabase } from "./db-connection";
import type { DbNotebookBlock, NotebookBlockRow } from "./types";

export const notebookBlockQueries = {
  getByPage(pageId: string): DbNotebookBlock[] {
    const stmt = getDatabase().prepare(`
      SELECT b.*, 
        (SELECT COUNT(*) FROM cards c WHERE c.sourceBlockId = b.id) as cardCount 
      FROM notebook_blocks b 
      WHERE b.notebookTopicPageId = ? 
      ORDER BY b.position
    `);
    const rows = stmt.all(pageId) as NotebookBlockRow[];
    return rows.map(parseNotebookBlockRow);
  },

  getById(id: string): DbNotebookBlock | null {
    const stmt = getDatabase().prepare(`
      SELECT b.*, 
        (SELECT COUNT(*) FROM cards c WHERE c.sourceBlockId = b.id) as cardCount 
      FROM notebook_blocks b 
      WHERE b.id = ?
    `);
    const row = stmt.get(id) as NotebookBlockRow | undefined;
    return row ? parseNotebookBlockRow(row) : null;
  },

  getBySourceId(sourceId: string): DbNotebookBlock | null {
    const stmt = getDatabase().prepare(`
      SELECT b.*, 
        (SELECT COUNT(*) FROM cards c WHERE c.sourceBlockId = b.id) as cardCount 
      FROM notebook_blocks b 
      WHERE b.sourceItemId = ? 
      LIMIT 1
    `);
    const row = stmt.get(sourceId) as NotebookBlockRow | undefined;
    return row ? parseNotebookBlockRow(row) : null;
  },

  insert(block: DbNotebookBlock): void {
    const stmt = getDatabase().prepare(`
      INSERT INTO notebook_blocks (id, notebookTopicPageId, sourceItemId, content, annotations, mediaPath, position)
      VALUES (@id, @notebookTopicPageId, @sourceItemId, @content, @annotations, @mediaPath, @position)
    `);
    stmt.run({
      ...block,
      annotations: block.annotations || null,
      mediaPath: block.mediaPath || null,
    });
  },

  update(id: string, updates: Partial<DbNotebookBlock>): void {
    const stmt = getDatabase().prepare(
      "SELECT * FROM notebook_blocks WHERE id = ?"
    );
    const current = stmt.get(id) as NotebookBlockRow | undefined;
    if (!current) {
      throw new Error(`NotebookBlock not found: ${id}`);
    }

    const merged = { ...parseNotebookBlockRow(current), ...updates };
    const updateStmt = getDatabase().prepare(`
      UPDATE notebook_blocks SET
        notebookTopicPageId = @notebookTopicPageId,
        sourceItemId = @sourceItemId,
        content = @content,
        annotations = @annotations,
        mediaPath = @mediaPath,
        position = @position
      WHERE id = @id
    `);
    updateStmt.run({
      ...merged,
      annotations: merged.annotations || null,
      mediaPath: merged.mediaPath || null,
    });
  },

  delete(id: string): void {
    const stmt = getDatabase().prepare(
      "DELETE FROM notebook_blocks WHERE id = @id"
    );
    stmt.run({ id });
  },
};

export function parseNotebookBlockRow(row: NotebookBlockRow): DbNotebookBlock {
  return {
    id: row.id,
    notebookTopicPageId: row.notebookTopicPageId,
    sourceItemId: row.sourceItemId,
    content: row.content,
    annotations: row.annotations || undefined,
    mediaPath: row.mediaPath || undefined,
    position: row.position,
    cardCount: row.cardCount || 0,
  };
}
