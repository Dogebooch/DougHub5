import { getDatabase } from "./db-connection";
import type {
  DbNotebookBlock,
  NotebookBlockRow,
  IntakeQuizResult,
} from "./types";
import type {
  ExamTrapType,
  NotebookBlockAiEvaluation,
  RelevanceScore,
} from "../../src/types/index";

export interface NotebookBlockQueryOptions {
  highYieldOnly?: boolean;
}

export const notebookBlockQueries = {
  getByPage(
    pageId: string,
    options?: NotebookBlockQueryOptions,
  ): DbNotebookBlock[] {
    const whereClause = options?.highYieldOnly
      ? "WHERE b.notebookTopicPageId = ? AND b.isHighYield = 1"
      : "WHERE b.notebookTopicPageId = ?";

    const stmt = getDatabase().prepare(`
      SELECT b.*, 
        (SELECT COUNT(*) FROM cards c WHERE c.sourceBlockId = b.id) as cardCount 
      FROM notebook_blocks b 
      ${whereClause}
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

  getBySourceDetailed(
    sourceId: string,
  ): { block: DbNotebookBlock; topicName: string; pageId: string }[] {
    const stmt = getDatabase().prepare(`
      SELECT b.*, t.canonicalName as topicName, p.id as pageId,
        (SELECT COUNT(*) FROM cards c WHERE c.sourceBlockId = b.id) as cardCount 
      FROM notebook_blocks b 
      JOIN notebook_topic_pages p ON b.notebookTopicPageId = p.id
      JOIN canonical_topics t ON p.canonicalTopicId = t.id
      WHERE b.sourceItemId = ? 
      ORDER BY b.position
    `);
    const rows = stmt.all(sourceId) as (NotebookBlockRow & {
      topicName: string;
      pageId: string;
    })[];
    return rows.map((row) => ({
      block: parseNotebookBlockRow(row),
      topicName: row.topicName,
      pageId: row.pageId,
    }));
  },

  insert(block: DbNotebookBlock): void {
    const stmt = getDatabase().prepare(`
      INSERT INTO notebook_blocks (
        id, notebookTopicPageId, sourceItemId, content, annotations, mediaPath, position,
        userInsight, aiEvaluation, relevanceScore, relevanceReason, calloutType, isHighYield,
        intakeQuizResult, intakeQuizAnswer, priorityScore, priorityReasons
      )
      VALUES (
        @id, @notebookTopicPageId, @sourceItemId, @content, @annotations, @mediaPath, @position,
        @userInsight, @aiEvaluation, @relevanceScore, @relevanceReason, @calloutType, @isHighYield,
        @intakeQuizResult, @intakeQuizAnswer, @priorityScore, @priorityReasons
      )
    `);
    stmt.run({
      ...block,
      annotations: block.annotations || null,
      mediaPath: block.mediaPath || null,
      userInsight: block.userInsight || null,
      aiEvaluation: block.aiEvaluation
        ? JSON.stringify(block.aiEvaluation)
        : null,
      relevanceScore: block.relevanceScore || null,
      relevanceReason: block.relevanceReason || null,
      calloutType: block.calloutType || null,
      isHighYield: block.isHighYield ? 1 : 0,
      intakeQuizResult: block.intakeQuizResult || null,
      intakeQuizAnswer: block.intakeQuizAnswer || null,
      priorityScore: block.priorityScore ?? 50,
      priorityReasons: block.priorityReasons
        ? JSON.stringify(block.priorityReasons)
        : null,
    });
  },

  update(id: string, updates: Partial<DbNotebookBlock>): void {
    const stmt = getDatabase().prepare(
      "SELECT * FROM notebook_blocks WHERE id = ?",
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
        position = @position,
        userInsight = @userInsight,
        aiEvaluation = @aiEvaluation,
        relevanceScore = @relevanceScore,
        relevanceReason = @relevanceReason,
        calloutType = @calloutType,
        isHighYield = @isHighYield,
        intakeQuizResult = @intakeQuizResult,
        intakeQuizAnswer = @intakeQuizAnswer,
        priorityScore = @priorityScore,
        priorityReasons = @priorityReasons
      WHERE id = @id
    `);
    updateStmt.run({
      ...merged,
      annotations: merged.annotations || null,
      mediaPath: merged.mediaPath || null,
      userInsight: merged.userInsight || null,
      aiEvaluation: merged.aiEvaluation
        ? JSON.stringify(merged.aiEvaluation)
        : null,
      relevanceScore: merged.relevanceScore || null,
      relevanceReason: merged.relevanceReason || null,
      calloutType: merged.calloutType || null,
      isHighYield: merged.isHighYield ? 1 : 0,
      intakeQuizResult: merged.intakeQuizResult || null,
      intakeQuizAnswer: merged.intakeQuizAnswer || null,
      priorityScore: merged.priorityScore ?? 50,
      priorityReasons: merged.priorityReasons
        ? JSON.stringify(merged.priorityReasons)
        : null,
    });
  },

  getExamTrapBreakdown(): { trapType: ExamTrapType; count: number }[] {
    const stmt = getDatabase().prepare(
      "SELECT aiEvaluation FROM notebook_blocks WHERE aiEvaluation IS NOT NULL",
    );
    const rows = stmt.all() as { aiEvaluation: string }[];

    const trapCounts = new Map<string, number>();

    for (const row of rows) {
      try {
        const evaluation = JSON.parse(
          row.aiEvaluation,
        ) as NotebookBlockAiEvaluation;
        if (evaluation.examTrapType) {
          trapCounts.set(
            evaluation.examTrapType as string,
            (trapCounts.get(evaluation.examTrapType as string) || 0) + 1,
          );
        }
      } catch {
        /* skip invalid */
      }
    }

    return Array.from(trapCounts.entries())
      .map(([trapType, count]) => ({
        trapType: trapType as ExamTrapType,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  },

  getConfusionPairsAggregated(): { tag: string; count: number }[] {
    const stmt = getDatabase().prepare(
      "SELECT aiEvaluation FROM notebook_blocks WHERE aiEvaluation IS NOT NULL",
    );
    const rows = stmt.all() as { aiEvaluation: string }[];

    const tagCounts = new Map<string, number>();

    for (const row of rows) {
      try {
        const evaluation = JSON.parse(
          row.aiEvaluation,
        ) as NotebookBlockAiEvaluation;
        if (
          evaluation.confusionTags &&
          Array.isArray(evaluation.confusionTags)
        ) {
          for (const tag of evaluation.confusionTags) {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          }
        }
      } catch {
        /* skip invalid */
      }
    }

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  },

  searchByContent(
    query: string,
    excludeBlockId?: string,
    limit = 10,
  ): { block: DbNotebookBlock; topicName: string; excerpt: string }[] {
    const db = getDatabase();
    let sql = `
      SELECT b.*, t.canonicalName as topicName,
        (SELECT COUNT(*) FROM cards c WHERE c.sourceBlockId = b.id) as cardCount
      FROM notebook_blocks b
      JOIN notebook_topic_pages p ON b.notebookTopicPageId = p.id
      JOIN canonical_topics t ON p.canonicalTopicId = t.id
      WHERE b.content LIKE ?
    `;
    const params: any[] = [`%${query}%`];

    if (excludeBlockId) {
      sql += ` AND b.id != ?`;
      params.push(excludeBlockId);
    }

    sql += ` LIMIT ?`;
    params.push(limit);

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params) as (NotebookBlockRow & {
      topicName: string;
    })[];

    return rows.map((row) => ({
      block: parseNotebookBlockRow(row),
      topicName: row.topicName,
      excerpt: row.content.substring(0, 100).trim(),
    }));
  },

  delete(id: string): void {
    const stmt = getDatabase().prepare(
      "DELETE FROM notebook_blocks WHERE id = @id",
    );
    stmt.run({ id });
  },
};

export function parseNotebookBlockRow(row: NotebookBlockRow): DbNotebookBlock {
  let aiEvaluation;
  if (row.aiEvaluation) {
    try {
      aiEvaluation = JSON.parse(row.aiEvaluation);
    } catch (e) {
      console.error(
        `[Database] Failed to parse aiEvaluation for block ${row.id}:`,
        e,
      );
    }
  }

  let priorityReasons: string[] | undefined;
  if (row.priorityReasons) {
    try {
      priorityReasons = JSON.parse(row.priorityReasons);
    } catch (e) {
      console.error(
        `[Database] Failed to parse priorityReasons for block ${row.id}:`,
        e,
      );
    }
  }

  return {
    id: row.id,
    notebookTopicPageId: row.notebookTopicPageId,
    sourceItemId: row.sourceItemId,
    content: row.content,
    annotations: row.annotations || undefined,
    mediaPath: row.mediaPath || undefined,
    position: row.position,
    cardCount: row.cardCount || 0,
    userInsight: row.userInsight || undefined,
    aiEvaluation,
    relevanceScore: (row.relevanceScore as RelevanceScore) || "unknown",
    relevanceReason: row.relevanceReason || undefined,
    calloutType: (row.calloutType as "pearl" | "trap" | "caution") || undefined,
    isHighYield: row.isHighYield === 1,
    // Notebook v2: Intake Quiz tracking (v24)
    intakeQuizResult: (row.intakeQuizResult as IntakeQuizResult) || undefined,
    intakeQuizAnswer: row.intakeQuizAnswer || undefined,
    priorityScore: row.priorityScore ?? 50,
    priorityReasons,
  };
}
