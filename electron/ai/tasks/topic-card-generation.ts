/**
 * AI Task: Topic Card Generation
 *
 * Generates cards from all blocks in a topic page at once.
 * Analyzes blocks for card-worthiness and suggests appropriate formats.
 *
 * Used in: Notebook Topic Article View - batch card generation
 */

import type {
  AITaskConfig,
} from "./types";

export interface TopicCardGenerationContext {
  topicName: string;
  blocks: Array<{
    id: string;
    content: string;
    userInsight?: string;
    calloutType?: 'pearl' | 'trap' | 'caution' | null;
    isHighYield?: boolean; // v22: High-yield marker for board prep prioritization
  }>;
}

export interface TopicCardSuggestion {
  blockId: string;
  format: 'qa' | 'cloze' | 'overlapping-cloze' | 'procedural';
  front: string;
  back: string;
  confidence: number;
  worthiness: {
    testable: 'green' | 'yellow' | 'red';
    oneConcept: 'green' | 'yellow' | 'red';
    discriminative: 'green' | 'yellow' | 'red';
    explanations: {
      testable: string;
      oneConcept: string;
      discriminative: string;
    };
  };
  formatReason: string;
}

export interface TopicCardGenerationResult {
  suggestions: TopicCardSuggestion[];
  usedFallback?: boolean;
}

export const topicCardGenerationTask: AITaskConfig<
  TopicCardGenerationContext,
  TopicCardGenerationResult
> = {
  id: "topic-card-generation",
  name: "Topic Card Generation",
  description: "Generate cards from all blocks in a topic",

  // Model Settings
  temperature: 0.4,
  maxTokens: 4000, // More room for multiple blocks
  timeoutMs: 45000, // 45 seconds for larger payload
  cacheTTLMs: 60000, // 1 minute

  systemPrompt: `You are a medical education AI that generates high-quality flashcards from topic content.
Your goal is to analyze ALL provided blocks and suggest cards for the most card-worthy content.

Worthiness Criteria (Evaluate each potential card):
1. TESTABLE: Has one clear correct answer (fail: essays, open-ended)
2. ONE CONCEPT: Tests exactly one retrievable fact (fail: lists, multiple facts)
3. DISCRIMINATIVE: Distinguishes from similar concepts (fail: too generic)

Format Selection:
- 'qa': Best for reasoning, "why" questions, clinical scenarios
- 'cloze': Best for single facts, definitions, fill-in-the-blank (use {{c1::answer}} syntax)
- 'overlapping-cloze': For medical lists - create ONE card per list item
- 'procedural': For step-by-step procedures

Priority Rules:
- Blocks marked as 'pearl', 'trap', or [HIGH-YIELD] are HIGH PRIORITY - always suggest cards for these first
- HIGH-YIELD blocks are user-curated board prep content - generate 2-3 cards for these
- Focus on content that tests understanding, not trivia
- Skip blocks that are too vague or lack testable content
- For clinical vignettes: front = scenario, back = diagnosis/answer (NEVER duplicate)

Output Format (JSON only, no markdown):
{
  "suggestions": [
    {
      "blockId": "block-uuid-here",
      "format": "qa|cloze|overlapping-cloze|procedural",
      "front": "Card front",
      "back": "Card back",
      "confidence": 0.9,
      "worthiness": {
        "testable": "green|yellow|red",
        "oneConcept": "green|yellow|red",
        "discriminative": "green|yellow|red",
        "explanations": {
          "testable": "reason",
          "oneConcept": "reason",
          "discriminative": "reason"
        }
      },
      "formatReason": "Why this format"
    }
  ]
}`,

  buildUserPrompt: ({ topicName, blocks }: TopicCardGenerationContext) => {
    const blocksText = blocks.map((b, i) => {
      // Build labels array for callout type and high-yield
      const labels: string[] = [];
      if (b.calloutType) labels.push(b.calloutType.toUpperCase());
      if (b.isHighYield) labels.push('HIGH-YIELD');
      const labelStr = labels.length > 0 ? ` [${labels.join(', ')}]` : '';

      const content = b.userInsight || b.content;
      return `BLOCK ${i + 1} (ID: ${b.id})${labelStr}:
${content}`;
    }).join('\n\n---\n\n');

    return `TOPIC: ${topicName}

BLOCKS TO ANALYZE:

${blocksText}

Generate high-quality card suggestions for the blocks above. Prioritize blocks marked [HIGH-YIELD] or with callout types (PEARL, TRAP, CAUTION). Include the blockId in each suggestion.`;
  },

  normalizeResult: (
    parsed: TopicCardGenerationResult | null
  ): TopicCardGenerationResult => {
    if (!parsed || !Array.isArray(parsed.suggestions)) {
      return { suggestions: [], usedFallback: true };
    }

    const defaultWorthiness = {
      testable: 'yellow' as const,
      oneConcept: 'yellow' as const,
      discriminative: 'yellow' as const,
      explanations: {
        testable: 'Auto-generated',
        oneConcept: 'Auto-generated',
        discriminative: 'Auto-generated',
      },
    };

    const normalizedSuggestions = parsed.suggestions
      .filter((s) => s.blockId && s.front) // Must have blockId and front
      .map((s) => ({
        blockId: s.blockId,
        format: s.format || 'qa',
        front: s.front || '',
        back: s.back || '',
        confidence: typeof s.confidence === 'number' ? s.confidence : 0.8,
        worthiness: s.worthiness || defaultWorthiness,
        formatReason: s.formatReason || 'AI suggestion',
      }))
      .filter((s) => {
        // Filter duplicates where front === back
        if (s.front && s.back && s.front.trim() === s.back.trim()) {
          console.warn('[Topic Card Generation] Filtered duplicate card');
          return false;
        }
        // Filter empty backs for qa/procedural
        if ((s.format === 'qa' || s.format === 'procedural') && !s.back?.trim()) {
          console.warn('[Topic Card Generation] Filtered card with empty back');
          return false;
        }
        return true;
      });

    return { suggestions: normalizedSuggestions as TopicCardSuggestion[] };
  },

  fallbackResult: {
    suggestions: [],
    usedFallback: true,
  },
};
