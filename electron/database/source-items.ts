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
      "SELECT * FROM source_items ORDER BY createdAt DESC"
    );
    const rows = stmt.all() as SourceItemRow[];
    return rows.map(parseSourceItemRow);
  },

  getByStatus(status: SourceItemStatus): DbSourceItem[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM source_items WHERE status = ? ORDER BY createdAt DESC"
    );
    const rows = stmt.all(status) as SourceItemRow[];
    return rows.map(parseSourceItemRow);
  },

  getByType(type: SourceType): DbSourceItem[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM source_items WHERE sourceType = ? ORDER BY createdAt DESC"
    );
    const rows = stmt.all(type) as SourceItemRow[];
    return rows.map(parseSourceItemRow);
  },

  getById(id: string): DbSourceItem | null {
    const stmt = getDatabase().prepare(
      "SELECT * FROM source_items WHERE id = ?"
    );
    const row = stmt.get(id) as SourceItemRow | undefined;
    return row ? parseSourceItemRow(row) : null;
  },

  getByUrl(url: string): DbSourceItem | null {
    const stmt = getDatabase().prepare(
      "SELECT * FROM source_items WHERE sourceUrl = ?"
    );
    const row = stmt.get(url) as SourceItemRow | undefined;
    return row ? parseSourceItemRow(row) : null;
  },

  getByQuestionId(questionId: string): DbSourceItem | null {
    const stmt = getDatabase().prepare(
      "SELECT * FROM source_items WHERE questionId = ?"
    );
    const row = stmt.get(questionId) as SourceItemRow | undefined;
    return row ? parseSourceItemRow(row) : null;
  },

  insert(item: DbSourceItem): void {
    const stmt = getDatabase().prepare(`
      INSERT INTO source_items (
        id, sourceType, sourceName, sourceUrl, title, rawContent,
        mediaPath, transcription, canonicalTopicIds, tags, questionId,
        status, createdAt, processedAt, updatedAt
      ) VALUES (
        @id, @sourceType, @sourceName, @sourceUrl, @title, @rawContent,
        @mediaPath, @transcription, @canonicalTopicIds, @tags, @questionId,
        @status, @createdAt, @processedAt, @updatedAt
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
      status: item.status,
      createdAt: item.createdAt,
      processedAt: item.processedAt || null,
      updatedAt: item.updatedAt || null,
      canonicalTopicIds: JSON.stringify(item.canonicalTopicIds),
      tags: JSON.stringify(item.tags),
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
      "SELECT htmlPayload FROM source_raw_pages WHERE sourceItemId = ?"
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
        status = @status,
        createdAt = @createdAt,
        processedAt = @processedAt,
        updatedAt = @updatedAt
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
      status: merged.status,
      createdAt: merged.createdAt,
      processedAt: merged.processedAt || null,
      updatedAt: merged.updatedAt || null,
      canonicalTopicIds: JSON.stringify(merged.canonicalTopicIds),
      tags: JSON.stringify(merged.tags),
    });
  },

  delete(id: string): void {
    const stmt = getDatabase().prepare(
      "DELETE FROM source_items WHERE id = @id"
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
    status: row.status as SourceItemStatus,
    createdAt: row.createdAt,
    processedAt: row.processedAt || undefined,
    updatedAt: row.updatedAt || undefined,
  };
}

export function parseQuickCaptureRow(row: QuickCaptureRow): DbQuickCapture {
  return {
    ...row,
    extractionStatus: row.extractionStatus as ExtractionStatus,
  };
}
