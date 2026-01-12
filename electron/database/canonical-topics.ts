import { getDatabase } from "./db-connection";
import type { CanonicalTopicRow, DbCanonicalTopic } from "./types";

export const canonicalTopicQueries = {
  getAll(): DbCanonicalTopic[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM canonical_topics ORDER BY canonicalName"
    );
    const rows = stmt.all() as CanonicalTopicRow[];
    return rows.map(parseCanonicalTopicRow);
  },

  getById(id: string): DbCanonicalTopic | null {
    const stmt = getDatabase().prepare(
      "SELECT * FROM canonical_topics WHERE id = ?"
    );
    const row = stmt.get(id) as CanonicalTopicRow | undefined;
    return row ? parseCanonicalTopicRow(row) : null;
  },

  getByDomain(domain: string): DbCanonicalTopic[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM canonical_topics WHERE domain = ? ORDER BY canonicalName"
    );
    const rows = stmt.all(domain) as CanonicalTopicRow[];
    return rows.map(parseCanonicalTopicRow);
  },

  insert(topic: DbCanonicalTopic): void {
    const stmt = getDatabase().prepare(`
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

  update(id: string, updates: Partial<DbCanonicalTopic>): void {
    const current = canonicalTopicQueries.getById(id);
    if (!current) {
      throw new Error(`CanonicalTopic not found: ${id}`);
    }

    const merged = { ...current, ...updates };
    const stmt = getDatabase().prepare(`
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

  delete(id: string): void {
    const stmt = getDatabase().prepare(
      "DELETE FROM canonical_topics WHERE id = @id"
    );
    stmt.run({ id });
  },
};

export function parseCanonicalTopicRow(row: CanonicalTopicRow): DbCanonicalTopic {
  return {
    id: row.id,
    canonicalName: row.canonicalName,
    aliases: JSON.parse(row.aliases),
    domain: row.domain,
    parentTopicId: row.parentTopicId || undefined,
    createdAt: row.createdAt,
  };
}
