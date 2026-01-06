import crypto from "node:crypto";
import { canonicalTopicQueries, DbCanonicalTopic } from "./database";

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

  return topics.find(topic => {
    // Check canonical name
    if (normalize(topic.canonicalName) === normalizedInput) {
      return true;
    }
    // Check aliases
    return topic.aliases.some(alias => normalize(alias) === normalizedInput);
  }) || null;
}

/**
 * Gets an existing topic or creates a new one if not found.
 * Auto-generates a lowercase alias if the name has uppercase characters.
 * Defaults to 'general' domain if none provided.
 */
export function createOrGetTopic(name: string, domain: string = 'general'): DbCanonicalTopic {
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
