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
  
  const scoredTopics = allTopics.map(topic => {
    const canonical = topic.canonicalName.toLowerCase();
    const aliases = topic.aliases.map(a => a.toLowerCase());
    
    let score = 0;

    // 1. Exact canonical name
    if (canonical === normalizedInput) {
      score = 100;
    } 
    // 2. Exact alias
    else if (aliases.some(a => a === normalizedInput)) {
      score = 90;
    }
    // 3. Prefix canonical name
    else if (canonical.startsWith(normalizedInput)) {
      score = 80;
    }
    // 4. Prefix alias
    else if (aliases.some(a => a.startsWith(normalizedInput))) {
      score = 70;
    }
    // 5. Substring canonical name
    else if (canonical.includes(normalizedInput)) {
      score = 60;
    }
    // 6. Substring alias
    else if (aliases.some(a => a.includes(normalizedInput))) {
      score = 50;
    }

    return { topic, score };
  });

  return scoredTopics
    .filter(item => item.score > 0)
    .sort((a, b) => {
      // Sort by score descending
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Then alphabetically by canonical name
      return a.topic.canonicalName.localeCompare(b.topic.canonicalName);
    })
    .slice(0, 5)
    .map(item => item.topic);
}
