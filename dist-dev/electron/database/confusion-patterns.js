"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confusionPatternQueries = void 0;
const db_connection_1 = require("./db-connection");
exports.confusionPatternQueries = {
    /**
     * Create a new confusion pattern
     */
    create(pattern) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
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
    increment(id, newTopicId) {
        const db = (0, db_connection_1.getDatabase)();
        // Get current pattern
        const current = exports.confusionPatternQueries.getById(id);
        if (!current)
            return;
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
    find(conceptA, conceptB) {
        // Check both orders since we store with UNIQUE(conceptA, conceptB)
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      SELECT * FROM confusion_patterns
      WHERE (conceptA = ? AND conceptB = ?)
         OR (conceptA = ? AND conceptB = ?)
      LIMIT 1
    `);
        const row = stmt.get(conceptA, conceptB, conceptB, conceptA);
        return row ? parseConfusionPatternRow(row) : null;
    },
    /**
     * Get a confusion pattern by ID
     */
    getById(id) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM confusion_patterns WHERE id = ?");
        const row = stmt.get(id);
        return row ? parseConfusionPatternRow(row) : null;
    },
    /**
     * Get all confusion patterns, sorted by occurrence count
     */
    getAll() {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      SELECT * FROM confusion_patterns
      ORDER BY occurrenceCount DESC, lastOccurrence DESC
    `);
        const rows = stmt.all();
        return rows.map(parseConfusionPatternRow);
    },
    /**
     * Get confusion patterns for a specific topic
     */
    getByTopic(topicId) {
        // topicIds is stored as JSON array, use LIKE for simplicity
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      SELECT * FROM confusion_patterns
      WHERE topicIds LIKE ?
      ORDER BY occurrenceCount DESC
    `);
        const rows = stmt.all(`%"${topicId}"%`);
        return rows.map(parseConfusionPatternRow);
    },
    /**
     * Get patterns with high occurrence count (threshold for auto-disambiguation card)
     */
    getHighOccurrence(minCount = 3) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      SELECT * FROM confusion_patterns
      WHERE occurrenceCount >= ?
      ORDER BY occurrenceCount DESC
    `);
        const rows = stmt.all(minCount);
        return rows.map(parseConfusionPatternRow);
    },
    /**
     * Link a disambiguation card to a confusion pattern
     */
    setDisambiguationCard(patternId, cardId) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      UPDATE confusion_patterns SET disambiguationCardId = ? WHERE id = ?
    `);
        stmt.run(cardId, patternId);
    },
    /**
     * Delete a confusion pattern
     */
    delete(id) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("DELETE FROM confusion_patterns WHERE id = ?");
        stmt.run(id);
    },
    /**
     * Search for patterns containing a specific concept
     */
    searchByConcept(concept) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      SELECT * FROM confusion_patterns
      WHERE conceptA LIKE ? OR conceptB LIKE ?
      ORDER BY occurrenceCount DESC
    `);
        const searchTerm = `%${concept}%`;
        const rows = stmt.all(searchTerm, searchTerm);
        return rows.map(parseConfusionPatternRow);
    },
};
function parseConfusionPatternRow(row) {
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
