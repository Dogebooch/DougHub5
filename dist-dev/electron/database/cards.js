"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cardQueries = void 0;
exports.parseCardRow = parseCardRow;
const db_connection_1 = require("./db-connection");
exports.cardQueries = {
    getAll() {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM cards");
        const rows = stmt.all();
        return rows.map(parseCardRow);
    },
    getById(id) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM cards WHERE id = ?");
        const row = stmt.get(id);
        return row ? parseCardRow(row) : null;
    },
    insert(card) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      INSERT INTO cards (
        id, front, back, noteId, tags, dueDate, createdAt,
        stability, difficulty, elapsedDays, scheduledDays,
        reps, lapses, state, lastReview,
        cardType, parentListId, listPosition,
        notebookTopicPageId, sourceBlockId, aiTitle,
        targetedConfusion, relevanceScore, relevanceReason,
        activationStatus, activationTier, activationReasons,
        activatedAt, suspendReason, suspendedAt
      ) VALUES (
        @id, @front, @back, @noteId, @tags, @dueDate, @createdAt,
        @stability, @difficulty, @elapsedDays, @scheduledDays,
        @reps, @lapses, @state, @lastReview,
        @cardType, @parentListId, @listPosition,
        @notebookTopicPageId, @sourceBlockId, @aiTitle,
        @targetedConfusion, @relevanceScore, @relevanceReason,
        @activationStatus, @activationTier, @activationReasons,
        @activatedAt, @suspendReason, @suspendedAt
      )
    `);
        stmt.run({
            ...card,
            tags: JSON.stringify(card.tags),
            targetedConfusion: card.targetedConfusion || null,
            relevanceScore: card.relevanceScore || null,
            relevanceReason: card.relevanceReason || null,
            activationStatus: card.activationStatus || "active",
            activationTier: card.activationTier || null,
            activationReasons: card.activationReasons
                ? JSON.stringify(card.activationReasons)
                : null,
            activatedAt: card.activatedAt || null,
            suspendReason: card.suspendReason || null,
            suspendedAt: card.suspendedAt || null,
        });
    },
    update(id, updates) {
        const current = exports.cardQueries.getById(id);
        if (!current) {
            throw new Error(`Card not found: ${id}`);
        }
        const merged = { ...current, ...updates };
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
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
        sourceBlockId = @sourceBlockId,
        aiTitle = @aiTitle,
        targetedConfusion = @targetedConfusion,
        relevanceScore = @relevanceScore,
        relevanceReason = @relevanceReason,
        activationStatus = @activationStatus,
        activationTier = @activationTier,
        activationReasons = @activationReasons,
        activatedAt = @activatedAt,
        suspendReason = @suspendReason,
        suspendedAt = @suspendedAt
      WHERE id = @id
    `);
        stmt.run({
            ...merged,
            tags: JSON.stringify(merged.tags),
            targetedConfusion: merged.targetedConfusion || null,
            relevanceScore: merged.relevanceScore || null,
            relevanceReason: merged.relevanceReason || null,
            activationStatus: merged.activationStatus || "active",
            activationTier: merged.activationTier || null,
            activationReasons: merged.activationReasons
                ? JSON.stringify(merged.activationReasons)
                : null,
            activatedAt: merged.activatedAt || null,
            suspendReason: merged.suspendReason || null,
            suspendedAt: merged.suspendedAt || null,
        });
    },
    delete(id) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("DELETE FROM cards WHERE id = @id");
        stmt.run({ id });
    },
    getDueToday() {
        const now = new Date().toISOString();
        // Only return active cards that are due
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM cards WHERE dueDate <= ? AND activationStatus = 'active'");
        const rows = stmt.all(now);
        return rows.map(parseCardRow);
    },
    // =========================================================================
    // Notebook v2: Card Activation Methods (v24)
    // =========================================================================
    /**
     * Get cards by activation status
     */
    getByActivationStatus(status) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM cards WHERE activationStatus = ?");
        const rows = stmt.all(status);
        return rows.map(parseCardRow);
    },
    /**
     * Activate a dormant or suggested card
     */
    activate(id, tier = "user_manual", reasons = []) {
        const now = new Date().toISOString();
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      UPDATE cards SET
        activationStatus = 'active',
        activationTier = @tier,
        activationReasons = @reasons,
        activatedAt = @activatedAt,
        suspendReason = NULL,
        suspendedAt = NULL
      WHERE id = @id
    `);
        stmt.run({
            id,
            tier,
            reasons: JSON.stringify(reasons),
            activatedAt: now,
        });
    },
    /**
     * Suspend an active card
     */
    suspend(id, reason) {
        const now = new Date().toISOString();
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      UPDATE cards SET
        activationStatus = 'suspended',
        suspendReason = @reason,
        suspendedAt = @suspendedAt
      WHERE id = @id
    `);
        stmt.run({
            id,
            reason,
            suspendedAt: now,
        });
    },
    /**
     * Bulk activate cards
     */
    bulkActivate(ids, tier = "user_manual", reasons = []) {
        if (ids.length === 0)
            return;
        const now = new Date().toISOString();
        const db = (0, db_connection_1.getDatabase)();
        const stmt = db.prepare(`
      UPDATE cards SET
        activationStatus = 'active',
        activationTier = @tier,
        activationReasons = @reasons,
        activatedAt = @activatedAt,
        suspendReason = NULL,
        suspendedAt = NULL
      WHERE id = @id
    `);
        const bulkActivate = db.transaction((cardIds) => {
            for (const id of cardIds) {
                stmt.run({
                    id,
                    tier,
                    reasons: JSON.stringify(reasons),
                    activatedAt: now,
                });
            }
        });
        bulkActivate(ids);
    },
    /**
     * Bulk suspend cards
     */
    bulkSuspend(ids, reason) {
        if (ids.length === 0)
            return;
        const now = new Date().toISOString();
        const db = (0, db_connection_1.getDatabase)();
        const stmt = db.prepare(`
      UPDATE cards SET
        activationStatus = 'suspended',
        suspendReason = @reason,
        suspendedAt = @suspendedAt
      WHERE id = @id
    `);
        const bulkSuspend = db.transaction((cardIds) => {
            for (const id of cardIds) {
                stmt.run({
                    id,
                    reason,
                    suspendedAt: now,
                });
            }
        });
        bulkSuspend(ids);
    },
    /**
     * Get active cards for a topic page
     */
    getActiveByTopicPage(topicPageId) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      SELECT * FROM cards
      WHERE notebookTopicPageId = ? AND activationStatus = 'active'
      ORDER BY dueDate ASC
    `);
        const rows = stmt.all(topicPageId);
        return rows.map(parseCardRow);
    },
    /**
     * Get dormant cards for a topic page
     */
    getDormantByTopicPage(topicPageId) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      SELECT * FROM cards
      WHERE notebookTopicPageId = ? AND activationStatus = 'dormant'
      ORDER BY createdAt ASC
    `);
        const rows = stmt.all(topicPageId);
        return rows.map(parseCardRow);
    },
    /**
     * Check if a card is a leech (6+ lapses) and auto-suspend if needed
     * Returns true if card was suspended as a leech
     */
    checkAndSuspendLeech(id) {
        const card = exports.cardQueries.getById(id);
        if (!card)
            return false;
        const LEECH_THRESHOLD = 6;
        if (card.lapses >= LEECH_THRESHOLD && card.activationStatus === "active") {
            exports.cardQueries.suspend(id, "leech");
            return true;
        }
        return false;
    },
    getCardsByBlockId(blockId) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM cards WHERE sourceBlockId = ?");
        const rows = stmt.all(blockId);
        return rows.map(parseCardRow);
    },
    getBySiblings(sourceBlockId) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
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
        const rows = stmt.all(sourceBlockId);
        return rows.map((row) => ({
            ...parseCardRow(row),
            topicName: row.topicName,
            siblingCount: row.siblingCount || 0,
            isLeech: row.isLeech === 1,
        }));
    },
    getTopicMetadata(pageId) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      SELECT
        ct.canonicalName as name,
        (SELECT COUNT(*) FROM cards WHERE notebookTopicPageId = ntp.id) as cardCount
      FROM notebook_topic_pages ntp
      JOIN canonical_topics ct ON ntp.canonicalTopicId = ct.id
      WHERE ntp.id = ?
    `);
        const row = stmt.get(pageId);
        return row || null;
    },
    getWeakTopicSummaries() {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
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
        const rows = stmt.all();
        return rows;
    },
    findDuplicateFrontBack() {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      SELECT * FROM cards
      WHERE TRIM(front) = TRIM(back)
      AND front IS NOT NULL
      AND back IS NOT NULL
      AND TRIM(front) != ''
      ORDER BY createdAt DESC
    `);
        const rows = stmt.all();
        return rows.map(parseCardRow);
    },
    getBrowserList(filters, sort) {
        const db = (0, db_connection_1.getDatabase)();
        const whereClauses = [];
        const params = {};
        if (filters?.status && filters.status.length > 0) {
            whereClauses.push(`c.state IN (${filters.status.join(",")})`);
        }
        if (filters?.topicId) {
            whereClauses.push("c.notebookTopicPageId = @topicId");
            params.topicId = filters.topicId;
        }
        if (filters?.tags && filters.tags.length > 0) {
            const tagConditions = filters.tags.map((_, i) => {
                params[`tag${i}`] = `%"${filters.tags[i]}"%`;
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
        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
        const sortField = sort?.field || "dueDate";
        const sortDir = sort?.direction || "asc";
        const sortMap = {
            dueDate: "c.dueDate",
            createdAt: "c.createdAt",
            difficulty: "c.difficulty",
            lastReview: "c.lastReview",
        };
        const orderClause = `ORDER BY ${sortMap[sortField]} ${sortDir.toUpperCase()} NULLS LAST`;
        // OPTIMIZATION (v25): Use indexed subqueries
        console.log("[DB] getBrowserList execution started", { filters, sort });
        const start = Date.now();
        try {
            const stmt = db.prepare(`
        SELECT
          c.*,
          ct.canonicalName as topicName,
          (SELECT COUNT(*) FROM cards c2 WHERE c2.sourceBlockId = c.sourceBlockId AND c.sourceBlockId IS NOT NULL) as siblingCount,
          (SELECT COUNT(*) FROM cards c3 WHERE c3.parentListId = c.parentListId AND c.parentListId IS NOT NULL) as listSiblingCount,
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
            const rows = stmt.all(params);
            console.log(`[DB] getBrowserList query took ${Date.now() - start}ms for ${rows.length} rows`);
            const result = rows.map((row) => ({
                ...parseCardRow(row),
                topicName: row.topicName,
                siblingCount: row.siblingCount || 0,
                isLeech: row.isLeech === 1,
                listSiblingCount: row.listSiblingCount || 0,
            }));
            console.log(`[DB] getBrowserList mapping took ${Date.now() - start}ms total`);
            return result;
        }
        catch (error) {
            console.error("[DB] getBrowserList failed:", error);
            throw error;
        }
    },
    getLowEaseTopics() {
        const db = (0, db_connection_1.getDatabase)();
        // A card is "struggling" if:
        // - difficulty >= 0.7 (FSRS scale 0-1, higher = harder)
        // - OR lapses >= 3
        // - OR (reps >= 5 AND stability < 7)
        const sql = `
      SELECT
        ntp.id as topicId,
        ct.canonicalName as topicName,
        COUNT(c.id) as strugglingCardCount,
        AVG(c.difficulty) as avgDifficulty,
        MAX(c.difficulty) as worstDifficulty
      FROM cards c
      JOIN notebook_topic_pages ntp ON c.notebookTopicPageId = ntp.id
      JOIN canonical_topics ct ON ntp.canonicalTopicId = ct.id
      WHERE c.difficulty >= 0.7
         OR c.lapses >= 3
         OR (c.reps >= 5 AND c.stability < 7)
      GROUP BY ntp.id
      HAVING strugglingCardCount > 0
      ORDER BY worstDifficulty DESC
    `;
        return db.prepare(sql).all();
    },
    /**
     * Get global card statistics including calculated retention rate.
     * Retention is calculated as the average retrievability of reviewed cards.
     * Retrievability formula: e^(-elapsedDays / stability)
     */
    getGlobalStats() {
        const db = (0, db_connection_1.getDatabase)();
        // Get counts
        const countsSql = `
      SELECT
        COUNT(*) as totalCards,
        SUM(CASE WHEN reps > 0 THEN 1 ELSE 0 END) as reviewedCards,
        SUM(CASE WHEN state = 0 THEN 1 ELSE 0 END) as newCards
      FROM cards
    `;
        const counts = db.prepare(countsSql).get();
        // Calculate average retrievability for cards that have been reviewed
        // Only include cards with stability > 0 to avoid division issues
        const retentionSql = `
      SELECT
        AVG(
          CASE
            WHEN stability > 0 AND reps > 0
            THEN EXP(-1.0 * elapsedDays / stability)
            ELSE NULL
          END
        ) as avgRetrievability
      FROM cards
      WHERE reps > 0 AND stability > 0
    `;
        const retentionResult = db.prepare(retentionSql).get();
        // Default to 0.89 (FSRS default) if no reviewed cards
        const retention = retentionResult.avgRetrievability ?? 0.89;
        return {
            totalCards: counts.totalCards || 0,
            reviewedCards: counts.reviewedCards || 0,
            newCards: counts.newCards || 0,
            retention: Math.round(retention * 100), // Return as percentage (0-100)
        };
    },
};
function parseCardRow(row) {
    return {
        ...row,
        tags: JSON.parse(row.tags),
        cardType: row.cardType || "standard",
        parentListId: row.parentListId,
        listPosition: row.listPosition,
        notebookTopicPageId: row.notebookTopicPageId,
        sourceBlockId: row.sourceBlockId,
        aiTitle: row.aiTitle,
        // Data Logging Framework (v18)
        targetedConfusion: row.targetedConfusion || undefined,
        relevanceScore: row.relevanceScore ||
            undefined,
        relevanceReason: row.relevanceReason || undefined,
        // Notebook v2: Card Activation (v24)
        activationStatus: row.activationStatus || "active",
        activationTier: row.activationTier || undefined,
        activationReasons: row.activationReasons
            ? JSON.parse(row.activationReasons)
            : undefined,
        activatedAt: row.activatedAt || undefined,
        suspendReason: row.suspendReason || undefined,
        suspendedAt: row.suspendedAt || undefined,
    };
}
