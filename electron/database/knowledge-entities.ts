/**
 * Knowledge Entities Query Module
 *
 * CRUD operations for the 8 Medical Knowledge Archetypes:
 * - Illness Script (Disease)
 * - Drug
 * - Pathogen
 * - Presentation (Chief Complaint + Physical Exam)
 * - Diagnostic
 * - Procedure
 * - Anatomy
 * - Algorithm
 * - Generic Concept (fallback)
 *
 * Features:
 * - Polymorphic entity storage
 * - Golden Ticket field enforcement
 * - Bidirectional entity linking
 * - Collision detection with fuzzy title matching
 * - Hierarchy support (parentEntityId)
 * - Multi-domain support (domains[])
 */

import { getDatabase } from "./db-connection";
import type {
  DbKnowledgeEntity,
  DbKnowledgeEntityLink,
  KnowledgeEntityRow,
  KnowledgeEntityLinkRow,
  KnowledgeEntityType,
  KnowledgeLinkType,
} from "./types";
import { GOLDEN_TICKET_FIELDS } from "./types";

// ============================================================================
// Entity CRUD Operations
// ============================================================================

export const knowledgeEntityQueries = {
  /**
   * Get all knowledge entities
   */
  getAll(): DbKnowledgeEntity[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM knowledge_entities ORDER BY title",
    );
    const rows = stmt.all() as KnowledgeEntityRow[];
    return rows.map(parseEntityRow);
  },

  /**
   * Get entity by ID
   */
  getById(id: string): DbKnowledgeEntity | null {
    const stmt = getDatabase().prepare(
      "SELECT * FROM knowledge_entities WHERE id = ?",
    );
    const row = stmt.get(id) as KnowledgeEntityRow | undefined;
    return row ? parseEntityRow(row) : null;
  },

  /**
   * Get all entities of a specific type
   */
  getByType(entityType: KnowledgeEntityType): DbKnowledgeEntity[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM knowledge_entities WHERE entityType = ? ORDER BY title",
    );
    const rows = stmt.all(entityType) as KnowledgeEntityRow[];
    return rows.map(parseEntityRow);
  },

  /**
   * Get entities by domain (checks JSON array with LIKE)
   */
  getByDomain(domain: string): DbKnowledgeEntity[] {
    const stmt = getDatabase().prepare(
      `SELECT * FROM knowledge_entities WHERE domains LIKE ? ORDER BY title`,
    );
    const rows = stmt.all(`%"${domain}"%`) as KnowledgeEntityRow[];
    return rows.map(parseEntityRow);
  },

  /**
   * Get child entities (for hierarchy traversal)
   */
  getChildren(parentEntityId: string): DbKnowledgeEntity[] {
    const stmt = getDatabase().prepare(
      "SELECT * FROM knowledge_entities WHERE parentEntityId = ? ORDER BY title",
    );
    const rows = stmt.all(parentEntityId) as KnowledgeEntityRow[];
    return rows.map(parseEntityRow);
  },

  /**
   * Get parent chain (for hierarchy display)
   */
  getAncestors(entityId: string): DbKnowledgeEntity[] {
    const ancestors: DbKnowledgeEntity[] = [];
    let current = knowledgeEntityQueries.getById(entityId);

    while (current?.parentEntityId) {
      const parent = knowledgeEntityQueries.getById(current.parentEntityId);
      if (parent) {
        ancestors.push(parent);
        current = parent;
      } else {
        break;
      }
    }

    return ancestors.reverse(); // Root first
  },

  /**
   * Insert new entity with Golden Ticket field enforcement
   */
  insert(entity: DbKnowledgeEntity): void {
    const now = new Date().toISOString();
    const goldenTicketField = GOLDEN_TICKET_FIELDS[entity.entityType];

    const stmt = getDatabase().prepare(`
      INSERT INTO knowledge_entities (
        id, entityType, title, domains, canonicalTopicId, parentEntityId,
        structuredData, goldenTicketField, goldenTicketValue, aiHintGoldenTicket,
        visualMnemonicTags, sourceItemId, notebookBlockId, createdAt, updatedAt
      ) VALUES (
        @id, @entityType, @title, @domains, @canonicalTopicId, @parentEntityId,
        @structuredData, @goldenTicketField, @goldenTicketValue, @aiHintGoldenTicket,
        @visualMnemonicTags, @sourceItemId, @notebookBlockId, @createdAt, @updatedAt
      )
    `);

    stmt.run({
      id: entity.id,
      entityType: entity.entityType,
      title: entity.title,
      domains: entity.domains ? JSON.stringify(entity.domains) : null,
      canonicalTopicId: entity.canonicalTopicId || null,
      parentEntityId: entity.parentEntityId || null,
      structuredData: JSON.stringify(entity.structuredData),
      goldenTicketField: goldenTicketField,
      goldenTicketValue: entity.goldenTicketValue || null,
      aiHintGoldenTicket: entity.aiHintGoldenTicket || null,
      visualMnemonicTags: entity.visualMnemonicTags
        ? JSON.stringify(entity.visualMnemonicTags)
        : null,
      sourceItemId: entity.sourceItemId || null,
      notebookBlockId: entity.notebookBlockId || null,
      createdAt: entity.createdAt || now,
      updatedAt: entity.updatedAt || now,
    });
  },

  /**
   * Update entity with collision detection
   */
  update(id: string, updates: Partial<DbKnowledgeEntity>): void {
    const current = knowledgeEntityQueries.getById(id);
    if (!current) {
      throw new Error(`KnowledgeEntity not found: ${id}`);
    }

    const merged = { ...current, ...updates };
    const now = new Date().toISOString();

    const stmt = getDatabase().prepare(`
      UPDATE knowledge_entities SET
        entityType = @entityType,
        title = @title,
        domains = @domains,
        canonicalTopicId = @canonicalTopicId,
        parentEntityId = @parentEntityId,
        structuredData = @structuredData,
        goldenTicketValue = @goldenTicketValue,
        aiHintGoldenTicket = @aiHintGoldenTicket,
        visualMnemonicTags = @visualMnemonicTags,
        sourceItemId = @sourceItemId,
        notebookBlockId = @notebookBlockId,
        updatedAt = @updatedAt
      WHERE id = @id
    `);

    stmt.run({
      id: merged.id,
      entityType: merged.entityType,
      title: merged.title,
      domains: merged.domains ? JSON.stringify(merged.domains) : null,
      canonicalTopicId: merged.canonicalTopicId || null,
      parentEntityId: merged.parentEntityId || null,
      structuredData: JSON.stringify(merged.structuredData),
      goldenTicketValue: merged.goldenTicketValue || null,
      aiHintGoldenTicket: merged.aiHintGoldenTicket || null,
      visualMnemonicTags: merged.visualMnemonicTags
        ? JSON.stringify(merged.visualMnemonicTags)
        : null,
      sourceItemId: merged.sourceItemId || null,
      notebookBlockId: merged.notebookBlockId || null,
      updatedAt: now,
    });
  },

  /**
   * Delete entity (cascades to links)
   */
  delete(id: string): void {
    const stmt = getDatabase().prepare(
      "DELETE FROM knowledge_entities WHERE id = @id",
    );
    stmt.run({ id });
  },

  /**
   * Find similar entities by title (for collision detection)
   * Uses fuzzy matching with LIKE and discriminates by entityType
   */
  findSimilar(
    title: string,
    entityType?: KnowledgeEntityType,
  ): DbKnowledgeEntity[] {
    // Normalize title for comparison
    const normalizedTitle = title.toLowerCase().trim();

    let query = `
      SELECT * FROM knowledge_entities
      WHERE LOWER(title) LIKE ?
    `;
    const params: unknown[] = [`%${normalizedTitle}%`];

    if (entityType) {
      query += ` AND entityType = ?`;
      params.push(entityType);
    }

    query += ` ORDER BY title LIMIT 10`;

    const stmt = getDatabase().prepare(query);
    const rows = stmt.all(...params) as KnowledgeEntityRow[];
    return rows.map(parseEntityRow);
  },

  /**
   * Check for exact duplicate (same title + same type)
   */
  findExactDuplicate(
    title: string,
    entityType: KnowledgeEntityType,
  ): DbKnowledgeEntity | null {
    const stmt = getDatabase().prepare(
      `SELECT * FROM knowledge_entities
       WHERE LOWER(title) = LOWER(?) AND entityType = ?`,
    );
    const row = stmt.get(title.trim(), entityType) as
      | KnowledgeEntityRow
      | undefined;
    return row ? parseEntityRow(row) : null;
  },

  /**
   * Set the Golden Ticket value (user completing the required field)
   */
  setGoldenTicketValue(id: string, value: string): void {
    const now = new Date().toISOString();
    const stmt = getDatabase().prepare(`
      UPDATE knowledge_entities
      SET goldenTicketValue = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(value, now, id);
  },

  /**
   * Reveal the AI hint for Golden Ticket (when user requests help)
   */
  revealAiHint(id: string): string | null {
    const entity = knowledgeEntityQueries.getById(id);
    return entity?.aiHintGoldenTicket || null;
  },

  /**
   * Search entities by text (title + structured data)
   */
  search(query: string, limit = 50): DbKnowledgeEntity[] {
    const stmt = getDatabase().prepare(`
      SELECT * FROM knowledge_entities
      WHERE title LIKE ? OR structuredData LIKE ?
      ORDER BY title
      LIMIT ?
    `);
    const pattern = `%${query}%`;
    const rows = stmt.all(pattern, pattern, limit) as KnowledgeEntityRow[];
    return rows.map(parseEntityRow);
  },
};

// ============================================================================
// Entity Link Operations
// ============================================================================

export const knowledgeEntityLinkQueries = {
  /**
   * Get all links for an entity (both directions)
   */
  getLinksForEntity(entityId: string): DbKnowledgeEntityLink[] {
    const stmt = getDatabase().prepare(`
      SELECT * FROM knowledge_entity_links
      WHERE sourceEntityId = ? OR targetEntityId = ?
      ORDER BY createdAt
    `);
    const rows = stmt.all(entityId, entityId) as KnowledgeEntityLinkRow[];
    return rows.map(parseLinkRow);
  },

  /**
   * Get linked entities (full entity objects, bidirectional)
   */
  getLinkedEntities(entityId: string): DbKnowledgeEntity[] {
    const stmt = getDatabase().prepare(`
      SELECT ke.* FROM knowledge_entities ke
      JOIN knowledge_entity_links kel ON
        (kel.sourceEntityId = ? AND kel.targetEntityId = ke.id) OR
        (kel.targetEntityId = ? AND kel.sourceEntityId = ke.id)
    `);
    const rows = stmt.all(entityId, entityId) as KnowledgeEntityRow[];
    return rows.map(parseEntityRow);
  },

  /**
   * Get linked entities by link type
   */
  getLinkedByType(
    entityId: string,
    linkType: KnowledgeLinkType,
  ): DbKnowledgeEntity[] {
    const stmt = getDatabase().prepare(`
      SELECT ke.* FROM knowledge_entities ke
      JOIN knowledge_entity_links kel ON
        (kel.sourceEntityId = ? AND kel.targetEntityId = ke.id AND kel.linkType = ?) OR
        (kel.targetEntityId = ? AND kel.sourceEntityId = ke.id AND kel.linkType = ?)
    `);
    const rows = stmt.all(
      entityId,
      linkType,
      entityId,
      linkType,
    ) as KnowledgeEntityRow[];
    return rows.map(parseEntityRow);
  },

  /**
   * Create a link between two entities
   */
  linkEntities(
    id: string,
    sourceEntityId: string,
    targetEntityId: string,
    linkType: KnowledgeLinkType,
  ): void {
    const now = new Date().toISOString();
    const stmt = getDatabase().prepare(`
      INSERT INTO knowledge_entity_links (id, sourceEntityId, targetEntityId, linkType, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, sourceEntityId, targetEntityId, linkType, now);
  },

  /**
   * Remove a link
   */
  unlinkEntities(linkId: string): void {
    const stmt = getDatabase().prepare(
      "DELETE FROM knowledge_entity_links WHERE id = ?",
    );
    stmt.run(linkId);
  },

  /**
   * Remove all links between two specific entities
   */
  unlinkByEntities(entityId1: string, entityId2: string): void {
    const stmt = getDatabase().prepare(`
      DELETE FROM knowledge_entity_links
      WHERE (sourceEntityId = ? AND targetEntityId = ?)
         OR (sourceEntityId = ? AND targetEntityId = ?)
    `);
    stmt.run(entityId1, entityId2, entityId2, entityId1);
  },

  /**
   * Check if link exists
   */
  linkExists(
    sourceEntityId: string,
    targetEntityId: string,
    linkType?: KnowledgeLinkType,
  ): boolean {
    let query = `
      SELECT 1 FROM knowledge_entity_links
      WHERE ((sourceEntityId = ? AND targetEntityId = ?)
          OR (sourceEntityId = ? AND targetEntityId = ?))
    `;
    const params: unknown[] = [
      sourceEntityId,
      targetEntityId,
      targetEntityId,
      sourceEntityId,
    ];

    if (linkType) {
      query += ` AND linkType = ?`;
      params.push(linkType);
    }

    const stmt = getDatabase().prepare(query);
    return stmt.get(...params) !== undefined;
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function parseEntityRow(row: KnowledgeEntityRow): DbKnowledgeEntity {
  return {
    id: row.id,
    entityType: row.entityType as KnowledgeEntityType,
    title: row.title,
    domains: row.domains ? JSON.parse(row.domains) : undefined,
    canonicalTopicId: row.canonicalTopicId || undefined,
    parentEntityId: row.parentEntityId || undefined,
    structuredData: JSON.parse(row.structuredData),
    goldenTicketField: row.goldenTicketField || undefined,
    goldenTicketValue: row.goldenTicketValue || undefined,
    aiHintGoldenTicket: row.aiHintGoldenTicket || undefined,
    visualMnemonicTags: row.visualMnemonicTags
      ? JSON.parse(row.visualMnemonicTags)
      : undefined,
    sourceItemId: row.sourceItemId || undefined,
    notebookBlockId: row.notebookBlockId || undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseLinkRow(row: KnowledgeEntityLinkRow): DbKnowledgeEntityLink {
  return {
    id: row.id,
    sourceEntityId: row.sourceEntityId,
    targetEntityId: row.targetEntityId,
    linkType: row.linkType as KnowledgeLinkType,
    createdAt: row.createdAt,
  };
}
