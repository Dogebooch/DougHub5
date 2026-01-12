import { getDatabase } from "./db-connection";
import type {
  CardRow,
  CardBrowserRow,
  CardType,
  DbCard,
  WeakTopicSummary,
  CardBrowserFilters,
  CardBrowserSort,
} from "./types";

export const cardQueries = {
  getAll(): DbCard[] {
    const stmt = getDatabase().prepare("SELECT * FROM cards");
    const rows = stmt.all() as CardRow[];
    return rows.map(parseCardRow);
  },

  getById(id: string): DbCard | null {
    const stmt = getDatabase().prepare("SELECT * FROM cards WHERE id = ?");
    const row = stmt.get(id) as CardRow | undefined;
    return row ? parseCardRow(row) : null;
  },

  insert(card: DbCard): void {
    const stmt = getDatabase().prepare(`
      INSERT INTO cards (
        id, front, back, noteId, tags, dueDate, createdAt,
        stability, difficulty, elapsedDays, scheduledDays,
        reps, lapses, state, lastReview,
        cardType, parentListId, listPosition,
        notebookTopicPageId, sourceBlockId
      ) VALUES (
        @id, @front, @back, @noteId, @tags, @dueDate, @createdAt,
        @stability, @difficulty, @elapsedDays, @scheduledDays,
        @reps, @lapses, @state, @lastReview,
        @cardType, @parentListId, @listPosition,
        @notebookTopicPageId, @sourceBlockId
      )
    `);
    stmt.run({
      ...card,
      tags: JSON.stringify(card.tags),
    });
  },

  update(id: string, updates: Partial<DbCard>): void {
    const current = cardQueries.getById(id);
    if (!current) {
      throw new Error(`Card not found: ${id}`);
    }

    const merged = { ...current, ...updates };
    const stmt = getDatabase().prepare(`
      UPDATE cards SET
        front = @front,
        back = @back,
        noteId = @noteId,
        tags = @tags,
        dueDate = @dueDate,
        createdAt = @createdAt,
        stability = @stability,
        difficulty = @difficulty,
        elapsedDays = @elapsedDays,
        scheduledDays = @scheduledDays,
        reps = @reps,
        lapses = @lapses,
        state = @state,
        lastReview = @lastReview,
        cardType = @cardType,
        parentListId = @parentListId,
        listPosition = @listPosition,
        notebookTopicPageId = @notebookTopicPageId,
        sourceBlockId = @sourceBlockId
      WHERE id = @id
    `);
    stmt.run({
      ...merged,
      tags: JSON.stringify(merged.tags),
    });
  },

  delete(id: string): void {
    const stmt = getDatabase().prepare("DELETE FROM cards WHERE id = @id");
    stmt.run({ id });
  },

  getDueToday(): DbCard[] {
    const now = new Date().toISOString();
    const stmt = getDatabase().prepare(
      "SELECT * FROM cards WHERE dueDate <= ?"
    );
    const rows = stmt.all(now) as CardRow[];
    return rows.map(parseCardRow);
  },

  getCardsByBlockId(blockId: string): DbCard[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM cards WHERE sourceBlockId = ?"
    );
    const rows = stmt.all(blockId) as CardRow[];
    return rows.map(parseCardRow);
  },

  getBySiblings(sourceBlockId: string): DbCard[] {
    const stmt = getDatabase().prepare(`
      SELECT 
        c.*,
        ct.canonicalName as topicName,
        (SELECT COUNT(*) FROM cards c2 
         WHERE c2.sourceBlockId = c.sourceBlockId 
         AND c.sourceBlockId IS NOT NULL) as siblingCount,
        CASE WHEN c.lapses >= 5 
          OR (c.lapses >= 3 AND c.difficulty > 0.7) 
          OR (c.reps >= 5 AND c.stability < 7)
          THEN 1 ELSE 0 END as isLeech
      FROM cards c
      LEFT JOIN notebook_topic_pages ntp ON c.notebookTopicPageId = ntp.id
      LEFT JOIN canonical_topics ct ON ntp.canonicalTopicId = ct.id
      WHERE c.sourceBlockId = ?
      ORDER BY c.createdAt ASC
    `);
    const rows = stmt.all(sourceBlockId) as CardBrowserRow[];
    return rows.map((row) => ({
      ...parseCardRow(row as unknown as CardRow),
      topicName: row.topicName,
      siblingCount: row.siblingCount || 0,
      isLeech: row.isLeech === 1,
    })) as DbCard[];
  },

  getTopicMetadata(pageId: string): { name: string; cardCount: number } | null {
    const stmt = getDatabase().prepare(`
      SELECT 
        ct.canonicalName as name,
        (SELECT COUNT(*) FROM cards WHERE notebookTopicPageId = ntp.id) as cardCount
      FROM notebook_topic_pages ntp 
      JOIN canonical_topics ct ON ntp.canonicalTopicId = ct.id 
      WHERE ntp.id = ?
    `);
    const row = stmt.get(pageId) as
      | { name: string; cardCount: number }
      | undefined;
    return row || null;
  },

  getWeakTopicSummaries(): WeakTopicSummary[] {
    const stmt = getDatabase().prepare(`
      SELECT 
        ct.id as topicId,
        ntp.id as notebookPageId,
        ct.canonicalName as topicName,
        COUNT(c.id) as cardCount,
        AVG(c.difficulty) as avgDifficulty,
        MAX(c.difficulty) as worstDifficulty,
        (SELECT id FROM cards 
         WHERE notebookTopicPageId = ntp.id 
         AND difficulty >= 8.0 
         ORDER BY difficulty DESC, lastReview DESC, id ASC 
         LIMIT 1) as worstCardId,
        MAX(c.lastReview) as lastReviewDate
      FROM cards c
      JOIN notebook_topic_pages ntp ON c.notebookTopicPageId = ntp.id
      JOIN canonical_topics ct ON ntp.canonicalTopicId = ct.id
      WHERE c.difficulty >= 8.0
      GROUP BY ct.id, ntp.id
      ORDER BY avgDifficulty DESC
    `);
    const rows = stmt.all() as WeakTopicSummary[];
    return rows;
  },

  findDuplicateFrontBack(): DbCard[] {
    const stmt = getDatabase().prepare(`
      SELECT * FROM cards 
      WHERE TRIM(front) = TRIM(back) 
      AND front IS NOT NULL 
      AND back IS NOT NULL 
      AND TRIM(front) != ''
      ORDER BY createdAt DESC
    `);
    const rows = stmt.all() as CardRow[];
    return rows.map(parseCardRow);
  },

  getBrowserList(
    filters?: CardBrowserFilters,
    sort?: CardBrowserSort
  ): DbCard[] {
    const db = getDatabase();
    const whereClauses: string[] = [];
    const params: Record<string, unknown> = {};

    if (filters?.status && filters.status.length > 0) {
      whereClauses.push(`c.state IN (${filters.status.join(",")})`);
    }

    if (filters?.topicId) {
      whereClauses.push("c.notebookTopicPageId = @topicId");
      params.topicId = filters.topicId;
    }

    if (filters?.tags && filters.tags.length > 0) {
      const tagConditions = filters.tags.map((_, i) => {
        params[`tag${i}`] = `%"${filters.tags![i]}"%`;
        return `c.tags LIKE @tag${i}`;
      });
      whereClauses.push(`(${tagConditions.join(" OR ")})`);
    }

    if (filters?.leechesOnly) {
      whereClauses.push(`(
        c.lapses >= 5 
        OR (c.lapses >= 3 AND c.difficulty > 0.7) 
        OR (c.reps >= 5 AND c.stability < 7)
      )`);
    }

    if (filters?.search) {
      whereClauses.push("(c.front LIKE @search OR c.back LIKE @search)");
      params.search = `%${filters.search}%`;
    }

    const whereClause =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const sortField = sort?.field || "dueDate";
    const sortDir = sort?.direction || "asc";
    const sortMap: Record<string, string> = {
      dueDate: "c.dueDate",
      createdAt: "c.createdAt",
      difficulty: "c.difficulty",
      lastReview: "c.lastReview",
    };
    const orderClause = `ORDER BY ${
      sortMap[sortField]
    } ${sortDir.toUpperCase()} NULLS LAST`;

    const stmt = db.prepare(`
      SELECT 
        c.*,
        ct.canonicalName as topicName,
        (SELECT COUNT(*) FROM cards c2 
         WHERE c2.sourceBlockId = c.sourceBlockId 
         AND c.sourceBlockId IS NOT NULL) as siblingCount,
        CASE WHEN c.lapses >= 5 
          OR (c.lapses >= 3 AND c.difficulty > 0.7) 
          OR (c.reps >= 5 AND c.stability < 7)
          THEN 1 ELSE 0 END as isLeech
      FROM cards c
      LEFT JOIN notebook_topic_pages ntp ON c.notebookTopicPageId = ntp.id
      LEFT JOIN canonical_topics ct ON ntp.canonicalTopicId = ct.id
      ${whereClause}
      ${orderClause}
    `);

    const rows = stmt.all(params) as CardBrowserRow[];

    return rows.map((row) => ({
      ...parseCardRow(row as unknown as CardRow),
      topicName: row.topicName,
      siblingCount: row.siblingCount || 0,
      isLeech: row.isLeech === 1,
    })) as DbCard[];
  },
};

export function parseCardRow(row: CardRow): DbCard {
  return {
    ...row,
    tags: JSON.parse(row.tags),
    cardType: (row.cardType as CardType) || "standard",
    parentListId: row.parentListId,
    listPosition: row.listPosition,
    notebookTopicPageId: row.notebookTopicPageId,
    sourceBlockId: row.sourceBlockId,
    aiTitle: row.aiTitle,
  };
}