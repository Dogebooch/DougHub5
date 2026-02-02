"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quickCaptureQueries = exports.sourceItemQueries = void 0;
exports.parseSourceItemRow = parseSourceItemRow;
exports.parseQuickCaptureRow = parseQuickCaptureRow;
exports.getBoardRelevanceForTopic = getBoardRelevanceForTopic;
const helpers_1 = require("./helpers");
const db_connection_1 = require("./db-connection");
function mapSourceToQuickCapture(item) {
    let extractionStatus = "pending";
    if (item.status === "processed" || item.status === "curated") {
        extractionStatus = "completed";
    }
    return {
        id: item.id,
        content: item.rawContent,
        extractionStatus,
        createdAt: item.createdAt,
        processedAt: item.processedAt || null,
    };
}
exports.sourceItemQueries = {
    getAll() {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM source_items ORDER BY createdAt DESC");
        const rows = stmt.all();
        return rows.map(parseSourceItemRow);
    },
    getByStatus(status) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM source_items WHERE status = ? ORDER BY createdAt DESC");
        const rows = stmt.all(status);
        return rows.map(parseSourceItemRow);
    },
    getByType(type) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM source_items WHERE sourceType = ? ORDER BY createdAt DESC");
        const rows = stmt.all(type);
        return rows.map(parseSourceItemRow);
    },
    getById(id) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM source_items WHERE id = ?");
        const row = stmt.get(id);
        return row ? parseSourceItemRow(row) : null;
    },
    getByUrl(url) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM source_items WHERE sourceUrl = ?");
        const row = stmt.get(url);
        return row ? parseSourceItemRow(row) : null;
    },
    getByQuestionId(questionId) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM source_items WHERE sourceType = 'qbank' AND questionId = ?");
        const row = stmt.get(questionId);
        return row ? parseSourceItemRow(row) : null;
    },
    insert(item) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      INSERT INTO source_items (
        id, sourceType, sourceName, sourceUrl, title, rawContent,
        mediaPath, transcription, canonicalTopicIds, tags, questionId,
        metadata, status, createdAt, processedAt, updatedAt,
        correctness, notes, testedConcepts, suggestedArchetypes
      ) VALUES (
        @id, @sourceType, @sourceName, @sourceUrl, @title, @rawContent,
        @mediaPath, @transcription, @canonicalTopicIds, @tags, @questionId,
        @metadata, @status, @createdAt, @processedAt, @updatedAt,
        @correctness, @notes, @testedConcepts, @suggestedArchetypes
      )
    `);
        stmt.run({
            id: item.id,
            sourceType: item.sourceType,
            sourceName: item.sourceName,
            sourceUrl: item.sourceUrl || null,
            title: item.title,
            rawContent: item.rawContent,
            mediaPath: item.mediaPath || null,
            transcription: item.transcription || null,
            questionId: item.questionId || null,
            metadata: item.metadata ? JSON.stringify(item.metadata) : null,
            status: item.status,
            createdAt: item.createdAt,
            processedAt: item.processedAt || null,
            updatedAt: item.updatedAt || null,
            canonicalTopicIds: JSON.stringify(item.canonicalTopicIds),
            tags: JSON.stringify(item.tags),
            correctness: item.correctness || null,
            notes: item.notes || null,
            testedConcepts: item.testedConcepts
                ? JSON.stringify(item.testedConcepts)
                : null,
            suggestedArchetypes: item.suggestedArchetypes
                ? JSON.stringify(item.suggestedArchetypes)
                : null,
        });
    },
    saveRawPage(sourceItemId, html) {
        const compressed = (0, helpers_1.compressString)(html);
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      INSERT INTO source_raw_pages (sourceItemId, htmlPayload, createdAt)
      VALUES (?, ?, ?)
      ON CONFLICT(sourceItemId) DO UPDATE SET
        htmlPayload = excluded.htmlPayload
    `);
        stmt.run(sourceItemId, compressed, new Date().toISOString());
    },
    getRawPage(sourceItemId) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT htmlPayload FROM source_raw_pages WHERE sourceItemId = ?");
        const row = stmt.get(sourceItemId);
        return row ? (0, helpers_1.decompressBuffer)(row.htmlPayload) : null;
    },
    purgeRawPages() {
        (0, db_connection_1.getDatabase)().exec("DELETE FROM source_raw_pages");
        console.log("[Database] Purged all raw HTML pages");
    },
    update(id, updates) {
        const current = exports.sourceItemQueries.getById(id);
        if (!current) {
            throw new Error(`SourceItem not found: ${id}`);
        }
        const merged = { ...current, ...updates };
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      UPDATE source_items SET
        sourceType = @sourceType,
        sourceName = @sourceName,
        sourceUrl = @sourceUrl,
        title = @title,
        rawContent = @rawContent,
        mediaPath = @mediaPath,
        transcription = @transcription,
        canonicalTopicIds = @canonicalTopicIds,
        tags = @tags,
        questionId = @questionId,
        metadata = @metadata,
        status = @status,
        createdAt = @createdAt,
        processedAt = @processedAt,
        updatedAt = @updatedAt,
        correctness = @correctness,
        notes = @notes,
        testedConcepts = @testedConcepts,
        suggestedArchetypes = @suggestedArchetypes
      WHERE id = @id
    `);
        stmt.run({
            id: merged.id,
            sourceType: merged.sourceType,
            sourceName: merged.sourceName,
            sourceUrl: merged.sourceUrl || null,
            title: merged.title,
            rawContent: merged.rawContent,
            mediaPath: merged.mediaPath || null,
            transcription: merged.transcription || null,
            questionId: merged.questionId || null,
            metadata: merged.metadata ? JSON.stringify(merged.metadata) : null,
            status: merged.status,
            createdAt: merged.createdAt,
            processedAt: merged.processedAt || null,
            updatedAt: merged.updatedAt || null,
            canonicalTopicIds: JSON.stringify(merged.canonicalTopicIds),
            tags: JSON.stringify(merged.tags),
            correctness: merged.correctness || null,
            notes: merged.notes || null,
            testedConcepts: merged.testedConcepts
                ? JSON.stringify(merged.testedConcepts)
                : null,
            suggestedArchetypes: merged.suggestedArchetypes
                ? JSON.stringify(merged.suggestedArchetypes)
                : null,
        });
    },
    delete(id) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("DELETE FROM source_items WHERE id = @id");
        stmt.run({ id });
    },
};
exports.quickCaptureQueries = {
    getAll() {
        const items = exports.sourceItemQueries.getByType("quickcapture");
        return items.map(mapSourceToQuickCapture);
    },
    getByStatus(status) {
        const items = exports.sourceItemQueries.getByType("quickcapture").filter((item) => {
            const qd = mapSourceToQuickCapture(item);
            return qd.extractionStatus === status;
        });
        return items.map(mapSourceToQuickCapture);
    },
    insert(capture) {
        const title = capture.content.substring(0, 50).trim() +
            (capture.content.length > 50 ? "..." : "");
        const sourceItem = {
            id: capture.id,
            sourceType: "quickcapture",
            sourceName: "Quick Capture",
            title: title,
            rawContent: capture.content,
            canonicalTopicIds: [],
            tags: [],
            status: capture.extractionStatus === "completed" ? "processed" : "inbox",
            createdAt: capture.createdAt,
            processedAt: capture.processedAt || undefined,
            updatedAt: capture.createdAt,
        };
        exports.sourceItemQueries.insert(sourceItem);
    },
    update(id, updates) {
        const current = exports.sourceItemQueries.getById(id);
        if (!current || current.sourceType !== "quickcapture") {
            throw new Error(`Quick capture not found: ${id}`);
        }
        const sourceUpdates = {};
        if (updates.content !== undefined) {
            sourceUpdates.rawContent = updates.content;
            sourceUpdates.title =
                updates.content.substring(0, 50).trim() +
                    (updates.content.length > 50 ? "..." : "");
        }
        if (updates.extractionStatus !== undefined) {
            sourceUpdates.status =
                updates.extractionStatus === "completed" ? "processed" : "inbox";
        }
        if (updates.processedAt !== undefined) {
            sourceUpdates.processedAt = updates.processedAt || undefined;
        }
        sourceUpdates.updatedAt = new Date().toISOString();
        exports.sourceItemQueries.update(id, sourceUpdates);
    },
    delete(id) {
        exports.sourceItemQueries.delete(id);
    },
};
function parseSourceItemRow(row) {
    return {
        id: row.id,
        sourceType: row.sourceType,
        sourceName: row.sourceName,
        sourceUrl: row.sourceUrl || undefined,
        title: row.title,
        rawContent: row.rawContent,
        mediaPath: row.mediaPath || undefined,
        transcription: row.transcription || undefined,
        canonicalTopicIds: JSON.parse(row.canonicalTopicIds),
        tags: JSON.parse(row.tags),
        questionId: row.questionId || undefined,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
        status: row.status,
        createdAt: row.createdAt,
        processedAt: row.processedAt || undefined,
        updatedAt: row.updatedAt || undefined,
        // Data Logging Framework (v18)
        correctness: row.correctness || null,
        notes: row.notes || undefined,
        testedConcepts: row.testedConcepts
            ? JSON.parse(row.testedConcepts)
            : undefined,
        // Medical Knowledge Archetypes (v27)
        suggestedArchetypes: row.suggestedArchetypes
            ? JSON.parse(row.suggestedArchetypes)
            : undefined,
    };
}
function parseQuickCaptureRow(row) {
    return {
        ...row,
        extractionStatus: row.extractionStatus,
    };
}
function getBoardRelevanceForTopic(topicTags) {
    const db = (0, db_connection_1.getDatabase)();
    if (topicTags.length === 0) {
        return {
            questionsAttempted: 0,
            correctCount: 0,
            accuracy: 0,
            testedConcepts: [],
            missedConcepts: [],
        };
    }
    // Build tag matching condition - check if any source tag matches any topic tag
    // Using JSON to handle the tags array stored as JSON string
    const rows = db
        .prepare(`
    SELECT id, correctness, testedConcepts, tags
    FROM source_items
    WHERE sourceType = 'qbank'
  `)
        .all();
    // Filter to items where tags overlap with topicTags
    const matchingItems = rows.filter((row) => {
        const itemTags = JSON.parse(row.tags || "[]");
        return itemTags.some((tag) => topicTags.some((topicTag) => tag.toLowerCase().includes(topicTag.toLowerCase()) ||
            topicTag.toLowerCase().includes(tag.toLowerCase())));
    });
    const questionsAttempted = matchingItems.length;
    const correctCount = matchingItems.filter((r) => r.correctness === "correct").length;
    const accuracy = questionsAttempted > 0
        ? Math.round((correctCount / questionsAttempted) * 100)
        : 0;
    // Aggregate testedConcepts
    const conceptCounts = new Map();
    const missedConcepts = [];
    matchingItems.forEach((item) => {
        const concepts = item.testedConcepts
            ? JSON.parse(item.testedConcepts)
            : [];
        concepts.forEach((concept) => {
            conceptCounts.set(concept, (conceptCounts.get(concept) || 0) + 1);
            // Track missed concepts (from incorrect answers)
            if (item.correctness === "incorrect") {
                missedConcepts.push({ concept, sourceItemId: item.id });
            }
        });
    });
    const testedConcepts = Array.from(conceptCounts.entries())
        .map(([concept, count]) => ({ concept, count }))
        .sort((a, b) => b.count - a.count);
    return {
        questionsAttempted,
        correctCount,
        accuracy,
        testedConcepts,
        missedConcepts,
    };
}
