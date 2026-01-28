import { getDatabase } from "./db-connection";
import type {
  DbConfusionPattern,
  ConfusionPatternRow,
} from "./types";

export const confusionPatternQueries = {
  /**
   * Create a new confusion pattern
   */
  create(pattern: DbConfusionPattern): void {
    const stmt = getDatabase().prepare(`
      INSERT INTO confusion_patterns (
        id, conceptA, conceptB, topicIds, occurrenceCount,
        lastOccurrence, disambiguationCardId
      ) VALUES (
        @id, @conceptA, @conceptB, @topicIds, @occurrenceCount,
        @lastOccurrence, @disambiguationCardId
      )
    `);
    stmt.run({
      ...pattern,
      topicIds: JSON.stringify(pattern.topicIds),
      disambiguationCardId: pattern.disambiguationCardId || null,
    });
  },

  /**
   * Increment the occurrence count and update lastOccurrence
   */
  increment(id: string, newTopicId?: string): void {
    const db = getDatabase();

    // Get current pattern
    const current = confusionPatternQueries.getById(id);
    if (!current) return;

    // Add new topic if provided and not already present
    let topicIds = current.topicIds;
    if (newTopicId && !topicIds.includes(newTopicId)) {
      topicIds = [...topicIds, newTopicId];
    }

    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE confusion_patterns SET
        occurrenceCount = occurrenceCount + 1,
        lastOccurrence = @lastOccurrence,
        topicIds = @topicIds
      WHERE id = @id
    `);
    stmt.run({
      id,
      lastOccurrence: now,
      topicIds: JSON.stringify(topicIds),
    });
  },

  /**
   * Find a confusion pattern by the two concepts (order-independent)
   */
  find(conceptA: string, conceptB: string): DbConfusionPattern | null {
    // Check both orders since we store with UNIQUE(conceptA, conceptB)
    const stmt = getDatabase().prepare(`
      SELECT * FROM confusion_patterns
      WHERE (conceptA = ? AND conceptB = ?)
         OR (conceptA = ? AND conceptB = ?)
      LIMIT 1
    `);
    const row = stmt.get(conceptA, conceptB, conceptB, conceptA) as ConfusionPatternRow | undefined;
    return row ? parseConfusionPatternRow(row) : null;
  },

  /**
   * Get a confusion pattern by ID
   */
  getById(id: string): DbConfusionPattern | null {
    const stmt = getDatabase().prepare(
      "SELECT * FROM confusion_patterns WHERE id = ?"
    );
    const row = stmt.get(id) as ConfusionPatternRow | undefined;
    return row ? parseConfusionPatternRow(row) : null;
  },

  /**
   * Get all confusion patterns, sorted by occurrence count
   */
  getAll(): DbConfusionPattern[] {
    const stmt = getDatabase().prepare(`
      SELECT * FROM confusion_patterns
      ORDER BY occurrenceCount DESC, lastOccurrence DESC
    `);
    const rows = stmt.all() as ConfusionPatternRow[];
    return rows.map(parseConfusionPatternRow);
  },

  /**
   * Get confusion patterns for a specific topic
   */
  getByTopic(topicId: string): DbConfusionPattern[] {
    // topicIds is stored as JSON array, use LIKE for simplicity
    const stmt = getDatabase().prepare(`
      SELECT * FROM confusion_patterns
      WHERE topicIds LIKE ?
      ORDER BY occurrenceCount DESC
    `);
    const rows = stmt.all(`%"${topicId}"%`) as ConfusionPatternRow[];
    return rows.map(parseConfusionPatternRow);
  },

  /**
   * Get patterns with high occurrence count (threshold for auto-disambiguation card)
   */
  getHighOccurrence(minCount = 3): DbConfusionPattern[] {
    const stmt = getDatabase().prepare(`
      SELECT * FROM confusion_patterns
      WHERE occurrenceCount >= ?
      ORDER BY occurrenceCount DESC
    `);
    const rows = stmt.all(minCount) as ConfusionPatternRow[];
    return rows.map(parseConfusionPatternRow);
  },

  /**
   * Link a disambiguation card to a confusion pattern
   */
  setDisambiguationCard(patternId: string, cardId: string): void {
    const stmt = getDatabase().prepare(`
      UPDATE confusion_patterns SET disambiguationCardId = ? WHERE id = ?
    `);
    stmt.run(cardId, patternId);
  },

  /**
   * Delete a confusion pattern
   */
  delete(id: string): void {
    const stmt = getDatabase().prepare(
      "DELETE FROM confusion_patterns WHERE id = ?"
    );
    stmt.run(id);
  },

  /**
   * Search for patterns containing a specific concept
   */
  searchByConcept(concept: string): DbConfusionPattern[] {
    const stmt = getDatabase().prepare(`
      SELECT * FROM confusion_patterns
      WHERE conceptA LIKE ? OR conceptB LIKE ?
      ORDER BY occurrenceCount DESC
    `);
    const searchTerm = `%${concept}%`;
    const rows = stmt.all(searchTerm, searchTerm) as ConfusionPatternRow[];
    return rows.map(parseConfusionPatternRow);
  },
};

function parseConfusionPatternRow(row: ConfusionPatternRow): DbConfusionPattern {
  return {
    id: row.id,
    conceptA: row.conceptA,
    conceptB: row.conceptB,
    topicIds: JSON.parse(row.topicIds),
    occurrenceCount: row.occurrenceCount,
    lastOccurrence: row.lastOccurrence,
    disambiguationCardId: row.disambiguationCardId || undefined,
  };
}
