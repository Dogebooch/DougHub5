"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalTopicQueries = void 0;
exports.parseCanonicalTopicRow = parseCanonicalTopicRow;
const db_connection_1 = require("./db-connection");
exports.canonicalTopicQueries = {
    getAll() {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM canonical_topics ORDER BY canonicalName");
        const rows = stmt.all();
        return rows.map(parseCanonicalTopicRow);
    },
    getById(id) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM canonical_topics WHERE id = ?");
        const row = stmt.get(id);
        return row ? parseCanonicalTopicRow(row) : null;
    },
    getByDomain(domain) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("SELECT * FROM canonical_topics WHERE domain = ? ORDER BY canonicalName");
        const rows = stmt.all(domain);
        return rows.map(parseCanonicalTopicRow);
    },
    insert(topic) {
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      INSERT INTO canonical_topics (id, canonicalName, aliases, domain, parentTopicId, createdAt)
      VALUES (@id, @canonicalName, @aliases, @domain, @parentTopicId, @createdAt)
    `);
        stmt.run({
            id: topic.id,
            canonicalName: topic.canonicalName,
            aliases: JSON.stringify(topic.aliases),
            domain: topic.domain,
            parentTopicId: topic.parentTopicId || null,
            createdAt: topic.createdAt,
        });
    },
    update(id, updates) {
        const current = exports.canonicalTopicQueries.getById(id);
        if (!current) {
            throw new Error(`CanonicalTopic not found: ${id}`);
        }
        const merged = { ...current, ...updates };
        const stmt = (0, db_connection_1.getDatabase)().prepare(`
      UPDATE canonical_topics SET
        canonicalName = @canonicalName,
        aliases = @aliases,
        domain = @domain,
        parentTopicId = @parentTopicId,
        createdAt = @createdAt
      WHERE id = @id
    `);
        stmt.run({
            id: merged.id,
            canonicalName: merged.canonicalName,
            aliases: JSON.stringify(merged.aliases),
            domain: merged.domain,
            parentTopicId: merged.parentTopicId || null,
            createdAt: merged.createdAt,
        });
    },
    delete(id) {
        const stmt = (0, db_connection_1.getDatabase)().prepare("DELETE FROM canonical_topics WHERE id = @id");
        stmt.run({ id });
    },
};
function parseCanonicalTopicRow(row) {
    return {
        id: row.id,
        canonicalName: row.canonicalName,
        aliases: JSON.parse(row.aliases),
        domain: row.domain,
        parentTopicId: row.parentTopicId || undefined,
        createdAt: row.createdAt,
    };
}
