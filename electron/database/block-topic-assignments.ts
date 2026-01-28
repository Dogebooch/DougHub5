import { getDatabase } from "./db-connection";
import type {
  DbBlockTopicAssignment,
  BlockTopicAssignmentRow,
} from "./types";

export const blockTopicAssignmentQueries = {
  /**
   * Create a new block-topic assignment
   */
  create(assignment: DbBlockTopicAssignment): void {
    const stmt = getDatabase().prepare(`
      INSERT INTO block_topic_assignments (
        id, blockId, topicPageId, isPrimaryTopic, createdAt
      ) VALUES (
        @id, @blockId, @topicPageId, @isPrimaryTopic, @createdAt
      )
    `);
    stmt.run({
      ...assignment,
      isPrimaryTopic: assignment.isPrimaryTopic ? 1 : 0,
    });
  },

  /**
   * Get all topic assignments for a block
   */
  getByBlock(blockId: string): DbBlockTopicAssignment[] {
    const stmt = getDatabase().prepare(`
      SELECT * FROM block_topic_assignments
      WHERE blockId = ?
      ORDER BY isPrimaryTopic DESC, createdAt ASC
    `);
    const rows = stmt.all(blockId) as BlockTopicAssignmentRow[];
    return rows.map(parseBlockTopicAssignmentRow);
  },

  /**
   * Get all block assignments for a topic page
   */
  getByTopicPage(topicPageId: string): DbBlockTopicAssignment[] {
    const stmt = getDatabase().prepare(`
      SELECT * FROM block_topic_assignments
      WHERE topicPageId = ?
      ORDER BY createdAt ASC
    `);
    const rows = stmt.all(topicPageId) as BlockTopicAssignmentRow[];
    return rows.map(parseBlockTopicAssignmentRow);
  },

  /**
   * Get the primary topic assignment for a block
   */
  getPrimaryForBlock(blockId: string): DbBlockTopicAssignment | null {
    const stmt = getDatabase().prepare(`
      SELECT * FROM block_topic_assignments
      WHERE blockId = ? AND isPrimaryTopic = 1
      LIMIT 1
    `);
    const row = stmt.get(blockId) as BlockTopicAssignmentRow | undefined;
    return row ? parseBlockTopicAssignmentRow(row) : null;
  },

  /**
   * Check if a block is assigned to a specific topic
   */
  exists(blockId: string, topicPageId: string): boolean {
    const stmt = getDatabase().prepare(`
      SELECT 1 FROM block_topic_assignments
      WHERE blockId = ? AND topicPageId = ?
      LIMIT 1
    `);
    const row = stmt.get(blockId, topicPageId);
    return row !== undefined;
  },

  /**
   * Set a topic as the primary topic for a block
   * (Unsets any existing primary)
   */
  setPrimary(blockId: string, topicPageId: string): void {
    const db = getDatabase();
    db.transaction(() => {
      // Unset existing primary
      db.prepare(`
        UPDATE block_topic_assignments
        SET isPrimaryTopic = 0
        WHERE blockId = ?
      `).run(blockId);

      // Set new primary
      db.prepare(`
        UPDATE block_topic_assignments
        SET isPrimaryTopic = 1
        WHERE blockId = ? AND topicPageId = ?
      `).run(blockId, topicPageId);
    })();
  },

  /**
   * Remove a block from a topic
   */
  remove(blockId: string, topicPageId: string): void {
    const stmt = getDatabase().prepare(`
      DELETE FROM block_topic_assignments
      WHERE blockId = ? AND topicPageId = ?
    `);
    stmt.run(blockId, topicPageId);
  },

  /**
   * Remove all assignments for a block
   */
  removeAllForBlock(blockId: string): void {
    const stmt = getDatabase().prepare(
      "DELETE FROM block_topic_assignments WHERE blockId = ?"
    );
    stmt.run(blockId);
  },

  /**
   * Get block IDs assigned to multiple topics
   */
  getMultiTopicBlocks(): { blockId: string; topicCount: number }[] {
    const stmt = getDatabase().prepare(`
      SELECT blockId, COUNT(*) as topicCount
      FROM block_topic_assignments
      GROUP BY blockId
      HAVING topicCount > 1
      ORDER BY topicCount DESC
    `);
    return stmt.all() as { blockId: string; topicCount: number }[];
  },

  /**
   * Bulk create assignments (for multi-topic selection)
   */
  bulkCreate(assignments: DbBlockTopicAssignment[]): void {
    if (assignments.length === 0) return;

    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO block_topic_assignments (
        id, blockId, topicPageId, isPrimaryTopic, createdAt
      ) VALUES (
        @id, @blockId, @topicPageId, @isPrimaryTopic, @createdAt
      )
    `);

    const bulkInsert = db.transaction((items: DbBlockTopicAssignment[]) => {
      for (const item of items) {
        stmt.run({
          ...item,
          isPrimaryTopic: item.isPrimaryTopic ? 1 : 0,
        });
      }
    });

    bulkInsert(assignments);
  },

  /**
   * Get topic page IDs for a block (useful for card associations)
   */
  getTopicPageIds(blockId: string): string[] {
    const stmt = getDatabase().prepare(`
      SELECT topicPageId FROM block_topic_assignments
      WHERE blockId = ?
    `);
    const rows = stmt.all(blockId) as { topicPageId: string }[];
    return rows.map((r) => r.topicPageId);
  },
};

function parseBlockTopicAssignmentRow(
  row: BlockTopicAssignmentRow
): DbBlockTopicAssignment {
  return {
    id: row.id,
    blockId: row.blockId,
    topicPageId: row.topicPageId,
    isPrimaryTopic: row.isPrimaryTopic === 1,
    createdAt: row.createdAt,
  };
}
