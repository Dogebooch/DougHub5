import { compressString, decompressBuffer } from "./helpers";
import { getDatabase } from "./db-connection";
import type {
  DbQuickCapture,
  DbSourceItem,
  ExtractionStatus,
  QuickCaptureRow,
  SourceItemRow,
  SourceItemStatus,
  SourceType,
} from "./types";

function mapSourceToQuickCapture(item: DbSourceItem): DbQuickCapture {
  let extractionStatus: ExtractionStatus = "pending";
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

export const sourceItemQueries = {
  getAll(): DbSourceItem[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM source_items ORDER BY createdAt DESC",
    );
    const rows = stmt.all() as SourceItemRow[];
    return rows.map(parseSourceItemRow);
  },

  getByStatus(status: SourceItemStatus): DbSourceItem[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM source_items WHERE status = ? ORDER BY createdAt DESC",
    );
    const rows = stmt.all(status) as SourceItemRow[];
    return rows.map(parseSourceItemRow);
  },

  getByType(type: SourceType): DbSourceItem[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM source_items WHERE sourceType = ? ORDER BY createdAt DESC",
    );
    const rows = stmt.all(type) as SourceItemRow[];
    return rows.map(parseSourceItemRow);
  },

  getById(id: string): DbSourceItem | null {
    const stmt = getDatabase().prepare(
      "SELECT * FROM source_items WHERE id = ?",
    );
    const row = stmt.get(id) as SourceItemRow | undefined;
    return row ? parseSourceItemRow(row) : null;
  },

  getByUrl(url: string): DbSourceItem | null {
    const stmt = getDatabase().prepare(
      "SELECT * FROM source_items WHERE sourceUrl = ?",
    );
    const row = stmt.get(url) as SourceItemRow | undefined;
    return row ? parseSourceItemRow(row) : null;
  },

  getByQuestionId(questionId: string): DbSourceItem | null {
    const stmt = getDatabase().prepare(
      "SELECT * FROM source_items WHERE sourceType = 'qbank' AND questionId = ?",
    );
    const row = stmt.get(questionId) as SourceItemRow | undefined;
    return row ? parseSourceItemRow(row) : null;
  },

  insert(item: DbSourceItem): void {
    const stmt = getDatabase().prepare(`
      INSERT INTO source_items (
        id, sourceType, sourceName, sourceUrl, title, rawContent,
        mediaPath, transcription, canonicalTopicIds, tags, questionId,
        metadata, status, createdAt, processedAt, updatedAt,
        correctness, notes, testedConcepts
      ) VALUES (
        @id, @sourceType, @sourceName, @sourceUrl, @title, @rawContent,
        @mediaPath, @transcription, @canonicalTopicIds, @tags, @questionId,
        @metadata, @status, @createdAt, @processedAt, @updatedAt,
        @correctness, @notes, @testedConcepts
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
    });
  },

  saveRawPage(sourceItemId: string, html: string): void {
    const compressed = compressString(html);
    const stmt = getDatabase().prepare(`
      INSERT INTO source_raw_pages (sourceItemId, htmlPayload, createdAt)
      VALUES (?, ?, ?)
      ON CONFLICT(sourceItemId) DO UPDATE SET
        htmlPayload = excluded.htmlPayload
    `);
    stmt.run(sourceItemId, compressed, new Date().toISOString());
  },

  getRawPage(sourceItemId: string): string | null {
    const stmt = getDatabase().prepare(
      "SELECT htmlPayload FROM source_raw_pages WHERE sourceItemId = ?",
    );
    const row = stmt.get(sourceItemId) as { htmlPayload: Buffer } | undefined;
    return row ? decompressBuffer(row.htmlPayload) : null;
  },

  purgeRawPages(): void {
    getDatabase().exec("DELETE FROM source_raw_pages");
    console.log("[Database] Purged all raw HTML pages");
  },

  update(id: string, updates: Partial<DbSourceItem>): void {
    const current = sourceItemQueries.getById(id);
    if (!current) {
      throw new Error(`SourceItem not found: ${id}`);
    }

    const merged = { ...current, ...updates };
    const stmt = getDatabase().prepare(`
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
        testedConcepts = @testedConcepts
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
    });
  },

  delete(id: string): void {
    const stmt = getDatabase().prepare(
      "DELETE FROM source_items WHERE id = @id",
    );
    stmt.run({ id });
  },
};

export const quickCaptureQueries = {
  getAll(): DbQuickCapture[] {
    const items = sourceItemQueries.getByType("quickcapture");
    return items.map(mapSourceToQuickCapture);
  },

  getByStatus(status: ExtractionStatus): DbQuickCapture[] {
    const items = sourceItemQueries.getByType("quickcapture").filter((item) => {
      const qd = mapSourceToQuickCapture(item);
      return qd.extractionStatus === status;
    });
    return items.map(mapSourceToQuickCapture);
  },

  insert(capture: DbQuickCapture): void {
    const title =
      capture.content.substring(0, 50).trim() +
      (capture.content.length > 50 ? "..." : "");

    const sourceItem: DbSourceItem = {
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
    sourceItemQueries.insert(sourceItem);
  },

  update(id: string, updates: Partial<DbQuickCapture>): void {
    const current = sourceItemQueries.getById(id);
    if (!current || current.sourceType !== "quickcapture") {
      throw new Error(`Quick capture not found: ${id}`);
    }

    const sourceUpdates: Partial<DbSourceItem> = {};
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

    sourceItemQueries.update(id, sourceUpdates);
  },

  delete(id: string): void {
    sourceItemQueries.delete(id);
  },
};

export function parseSourceItemRow(row: SourceItemRow): DbSourceItem {
  return {
    id: row.id,
    sourceType: row.sourceType as SourceType,
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
    status: row.status as SourceItemStatus,
    createdAt: row.createdAt,
    processedAt: row.processedAt || undefined,
    updatedAt: row.updatedAt || undefined,
    // Data Logging Framework (v18)
    correctness: (row.correctness as "correct" | "incorrect" | null) || null,
    notes: row.notes || undefined,
    testedConcepts: row.testedConcepts
      ? JSON.parse(row.testedConcepts)
      : undefined,
  };
}

export function parseQuickCaptureRow(row: QuickCaptureRow): DbQuickCapture {
  return {
    ...row,
    extractionStatus: row.extractionStatus as ExtractionStatus,
  };
}

export function getBoardRelevanceForTopic(topicTags: string[]): {
  questionsAttempted: number;
  correctCount: number;
  accuracy: number;
  testedConcepts: { concept: string; count: number }[];
  missedConcepts: { concept: string; sourceItemId: string }[];
} {
  const db = getDatabase();

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
    .prepare(
      `
    SELECT id, correctness, testedConcepts, tags
    FROM source_items 
    WHERE sourceType = 'qbank'
  `,
    )
    .all() as {
    id: string;
    correctness: string | null;
    testedConcepts: string | null;
    tags: string;
  }[];

  // Filter to items where tags overlap with topicTags
  const matchingItems = rows.filter((row) => {
    const itemTags: string[] = JSON.parse(row.tags || "[]");
    return itemTags.some((tag) =>
      topicTags.some(
        (topicTag) =>
          tag.toLowerCase().includes(topicTag.toLowerCase()) ||
          topicTag.toLowerCase().includes(tag.toLowerCase()),
      ),
    );
  });

  const questionsAttempted = matchingItems.length;
  const correctCount = matchingItems.filter(
    (r) => r.correctness === "correct",
  ).length;
  const accuracy =
    questionsAttempted > 0
      ? Math.round((correctCount / questionsAttempted) * 100)
      : 0;

  // Aggregate testedConcepts
  const conceptCounts = new Map<string, number>();
  const missedConcepts: { concept: string; sourceItemId: string }[] = [];

  matchingItems.forEach((item) => {
    const concepts: string[] = item.testedConcepts
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
