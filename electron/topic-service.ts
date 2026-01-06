import crypto from "node:crypto";
import {
  canonicalTopicQueries,
  DbCanonicalTopic,
  getDatabase,
  sourceItemQueries,
  smartViewQueries,
} from "./database";

/**
 * Normalizes a topic string for comparison.
 */
function normalize(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * Finds a matching canonical topic by name or alias (case-insensitive).
 * Returns the topic or null if no match is found.
 */
export function resolveTopicAlias(input: string): DbCanonicalTopic | null {
  const normalizedInput = normalize(input);
  const topics = canonicalTopicQueries.getAll();

  return (
    topics.find((topic) => {
      // Check canonical name
      if (normalize(topic.canonicalName) === normalizedInput) {
        return true;
      }
      // Check aliases
      return topic.aliases.some(
        (alias) => normalize(alias) === normalizedInput
      );
    }) || null
  );
}

/**
 * Gets an existing topic or creates a new one if not found.
 * Auto-generates a lowercase alias if the name has uppercase characters.
 * Defaults to 'general' domain if none provided.
 */
export function createOrGetTopic(
  name: string,
  domain: string = "general"
): DbCanonicalTopic {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Topic name cannot be empty");
  }

  const existing = resolveTopicAlias(trimmedName);
  if (existing) {
    return existing;
  }

  const topicId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  // Auto-generate aliases with deduplication
  const aliases = new Set<string>();
  const lowercaseName = trimmedName.toLowerCase();

  // Only add as alias if it's different from the display name
  if (lowercaseName !== trimmedName) {
    aliases.add(lowercaseName);
  }

  const newTopic: DbCanonicalTopic = {
    id: topicId,
    canonicalName: trimmedName,
    aliases: Array.from(aliases),
    domain,
    createdAt,
  };

  canonicalTopicQueries.insert(newTopic);
  return newTopic;
}

/**
 * Suggests up to 5 matching canonical topics based on partial input.
 * Priority: Exact Match > Prefix Match > Substring Match.
 * Case-insensitive, sorts by relevance then alphabetically.
 */
export function suggestTopicMatches(input: string): DbCanonicalTopic[] {
  const normalizedInput = input.trim().toLowerCase();

  if (!normalizedInput) {
    return [];
  }

  const allTopics = canonicalTopicQueries.getAll();

  const scoredTopics = allTopics.map((topic) => {
    const canonical = topic.canonicalName.toLowerCase();
    const aliases = topic.aliases.map((a) => a.toLowerCase());

    let score = 0;

    // 1. Exact canonical name
    if (canonical === normalizedInput) {
      score = 100;
    }
    // 2. Exact alias
    else if (aliases.some((a) => a === normalizedInput)) {
      score = 90;
    }
    // 3. Prefix canonical name
    else if (canonical.startsWith(normalizedInput)) {
      score = 80;
    }
    // 4. Prefix alias
    else if (aliases.some((a) => a.startsWith(normalizedInput))) {
      score = 70;
    }
    // 5. Substring canonical name
    else if (canonical.includes(normalizedInput)) {
      score = 60;
    }
    // 6. Substring alias
    else if (aliases.some((a) => a.includes(normalizedInput))) {
      score = 50;
    }

    return { topic, score };
  });

  return scoredTopics
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      // Sort by score descending
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Then alphabetically by canonical name
      return a.topic.canonicalName.localeCompare(b.topic.canonicalName);
    })
    .slice(0, 5)
    .map((item) => item.topic);
}

/**
 * Adds a new alias to an existing topic with global uniqueness validation.
 */
export function addTopicAlias(topicId: string, alias: string): void {
  const normalizedAlias = normalize(alias);
  if (!normalizedAlias) {
    throw new Error("Alias cannot be empty");
  }

  const topic = canonicalTopicQueries.getById(topicId);
  if (!topic) {
    throw new Error(`Topic not found: ${topicId}`);
  }

  // Idempotency: if the alias is already the canonical name or in aliases, do nothing.
  const isDuplicateOnSelf =
    normalize(topic.canonicalName) === normalizedAlias ||
    topic.aliases.some((a) => normalize(a) === normalizedAlias);
  if (isDuplicateOnSelf) {
    return;
  }

  // Global validation: Verify the alias doesn't already exist on ANY other topic
  const existingTopic = resolveTopicAlias(normalizedAlias);
  if (existingTopic) {
    throw new Error(
      `Alias '${alias.trim()}' already belongs to topic '${
        existingTopic.canonicalName
      }'`
    );
  }

  // If valid, add the alias and update the database
  const updatedAliases = [...topic.aliases, normalizedAlias];
  canonicalTopicQueries.update(topicId, { aliases: updatedAliases });
}

/**
 * Merges a source topic into a target topic.
 * Consolidates aliases, updates references in notebook pages, source items, and smart views.
 */
export function mergeTopics(sourceId: string, targetId: string): void {
  if (sourceId === targetId) {
    throw new Error("Cannot merge a topic into itself");
  }

  const db = getDatabase();

  const transaction = db.transaction(() => {
    const source = canonicalTopicQueries.getById(sourceId);
    const target = canonicalTopicQueries.getById(targetId);

    if (!source) throw new Error(`Source topic not found: ${sourceId}`);
    if (!target) throw new Error(`Target topic not found: ${targetId}`);

    // 1. Consolidate Aliases
    const allAliases = new Set([
      ...target.aliases.map(normalize),
      ...source.aliases.map(normalize),
      normalize(source.canonicalName),
    ]);

    // Remove target's own name from its aliases
    allAliases.delete(normalize(target.canonicalName));

    canonicalTopicQueries.update(targetId, {
      aliases: Array.from(allAliases).filter(Boolean),
    });

    // 2. Update notebook_topic_pages
    db.prepare(
      "UPDATE notebook_topic_pages SET canonicalTopicId = ? WHERE canonicalTopicId = ?"
    ).run(targetId, sourceId);

    // 3. Update source_items (Topics are stored as JSON array of IDs)
    const affectedSources = db
      .prepare("SELECT id FROM source_items WHERE canonicalTopicIds LIKE ?")
      .all(`%"${sourceId}"%`) as { id: string }[];

    for (const { id } of affectedSources) {
      const item = sourceItemQueries.getById(id);
      if (item) {
        const updatedTopicIds = new Set(item.canonicalTopicIds);
        updatedTopicIds.delete(sourceId);
        updatedTopicIds.add(targetId);
        sourceItemQueries.update(id, {
          canonicalTopicIds: Array.from(updatedTopicIds),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    // 4. Update smart_views (Filter contains topicIds array)
    const allViews = smartViewQueries.getAll();
    for (const view of allViews) {
      if (view.filter.topicIds && view.filter.topicIds.includes(sourceId)) {
        const updatedTopicIds = new Set(view.filter.topicIds);
        updatedTopicIds.delete(sourceId);
        updatedTopicIds.add(targetId);

        smartViewQueries.update(view.id, {
          filter: {
            ...view.filter,
            topicIds: Array.from(updatedTopicIds),
          },
        });
      }
    }

    // 5. Delete the source topic
    // This will throw a RESTRICT error if it has children, which is correct.
    canonicalTopicQueries.delete(sourceId);
  });

  transaction();
}
