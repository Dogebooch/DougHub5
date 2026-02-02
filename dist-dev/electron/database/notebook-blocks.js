"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notebookBlockQueries = void 0;
exports.parseNotebookBlockRow = parseNotebookBlockRow;
const db_connection_1 = require("./db-connection");
exports.notebookBlockQueries = {
    getByPage(pageId, options) {
        const whereClause = options?.highYieldOnly
            ? "WHERE b.notebookTopicPageId = ? AND b.isHighYield = 1"
            : "WHERE b.notebookTopicPageId = ?";
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      SELECT b.*, 
        (SELECT COUNT(*) FROM cards c WHERE c.sourceBlockId = b.id) as cardCount 
      FROM notebook_blocks b 
      ${whereClause}
      ORDER BY b.position
    `);
        const rows = stmt.all(pageId);
        return rows.map(parseNotebookBlockRow);
    },
    getById(id) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      SELECT b.*, 
        (SELECT COUNT(*) FROM cards c WHERE c.sourceBlockId = b.id) as cardCount 
      FROM notebook_blocks b 
      WHERE b.id = ?
    `);
        const row = stmt.get(id);
        return row ? parseNotebookBlockRow(row) : null;
    },
    getBySourceId(sourceId) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      SELECT b.*, 
        (SELECT COUNT(*) FROM cards c WHERE c.sourceBlockId = b.id) as cardCount 
      FROM notebook_blocks b 
      WHERE b.sourceItemId = ? 
      LIMIT 1
    `);
        const row = stmt.get(sourceId);
        return row ? parseNotebookBlockRow(row) : null;
    },
    getBySourceDetailed(sourceId) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      SELECT b.*, t.canonicalName as topicName, p.id as pageId,
        (SELECT COUNT(*) FROM cards c WHERE c.sourceBlockId = b.id) as cardCount 
      FROM notebook_blocks b 
      JOIN notebook_topic_pages p ON b.notebookTopicPageId = p.id
      JOIN canonical_topics t ON p.canonicalTopicId = t.id
      WHERE b.sourceItemId = ? 
      ORDER BY b.position
    `);
        const rows = stmt.all(sourceId);
        return rows.map((row) => ({
            block: parseNotebookBlockRow(row),
            topicName: row.topicName,
            pageId: row.pageId,
        }));
    },
    insert(block) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
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
    update(id, updates) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM notebook_blocks WHERE id = ?");
        const current = stmt.get(id);
        if (!current) {
            throw new Error(`NotebookBlock not found: ${id}`);
        }
        const merged = { ...parseNotebookBlockRow(current), ...updates };
        const updateStmt = (0, db_connection_1.getDatabase)().prepare(`
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
    getExamTrapBreakdown() {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT aiEvaluation FROM notebook_blocks WHERE aiEvaluation IS NOT NULL");
        const rows = stmt.all();
        const trapCounts = new Map();
        for (const row of rows) {
            try {
                const evaluation = JSON.parse(row.aiEvaluation);
                if (evaluation.examTrapType) {
                    trapCounts.set(evaluation.examTrapType, (trapCounts.get(evaluation.examTrapType) || 0) + 1);
                }
            }
            catch {
                /* skip invalid */
            }
        }
        return Array.from(trapCounts.entries())
            .map(([trapType, count]) => ({
            trapType: trapType,
            count,
        }))
            .sort((a, b) => b.count - a.count);
    },
    getConfusionPairsAggregated() {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT aiEvaluation FROM notebook_blocks WHERE aiEvaluation IS NOT NULL");
        const rows = stmt.all();
        const tagCounts = new Map();
        for (const row of rows) {
            try {
                const evaluation = JSON.parse(row.aiEvaluation);
                if (evaluation.confusionTags &&
                    Array.isArray(evaluation.confusionTags)) {
                    for (const tag of evaluation.confusionTags) {
                        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
                    }
                }
            }
            catch {
                /* skip invalid */
            }
        }
        return Array.from(tagCounts.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    },
    searchByContent(query, excludeBlockId, limit = 10) {
        const db = (0, db_connection_1.getDatabase)();
        let sql = `
      SELECT b.*, t.canonicalName as topicName,
        (SELECT COUNT(*) FROM cards c WHERE c.sourceBlockId = b.id) as cardCount
      FROM notebook_blocks b
      JOIN notebook_topic_pages p ON b.notebookTopicPageId = p.id
      JOIN canonical_topics t ON p.canonicalTopicId = t.id
      WHERE b.content LIKE ?
    `;
        const params = [`%${query}%`];
        if (excludeBlockId) {
            sql += ` AND b.id != ?`;
            params.push(excludeBlockId);
        }
        sql += ` LIMIT ?`;
        params.push(limit);
        const stmt = db.prepare(sql);
        const rows = stmt.all(...params);
        return rows.map((row) => ({
            block: parseNotebookBlockRow(row),
            topicName: row.topicName,
            excerpt: row.content.substring(0, 100).trim(),
        }));
    },
    delete(id) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("DELETE FROM notebook_blocks WHERE id = @id");
        stmt.run({ id });
    },
};
function parseNotebookBlockRow(row) {
    let aiEvaluation;
    if (row.aiEvaluation) {
        try {
            aiEvaluation = JSON.parse(row.aiEvaluation);
        }
        catch (e) {
            console.error(`[Database] Failed to parse aiEvaluation for block ${row.id}:`, e);
        }
    }
    let priorityReasons;
    if (row.priorityReasons) {
        try {
            priorityReasons = JSON.parse(row.priorityReasons);
        }
        catch (e) {
            console.error(`[Database] Failed to parse priorityReasons for block ${row.id}:`, e);
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
        relevanceScore: row.relevanceScore || "unknown",
        relevanceReason: row.relevanceReason || undefined,
        calloutType: row.calloutType || undefined,
        isHighYield: row.isHighYield === 1,
        // Notebook v2: Intake Quiz tracking (v24)
        intakeQuizResult: row.intakeQuizResult || undefined,
        intakeQuizAnswer: row.intakeQuizAnswer || undefined,
        priorityScore: row.priorityScore ?? 50,
        priorityReasons,
    };
}
