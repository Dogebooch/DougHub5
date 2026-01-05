/**
 * Overlapping Cloze Library
 * 
 * Generates overlapping cloze cards for medical lists where each list item
 * becomes an individually-scheduled FSRS card with shuffled sibling context.
 * 
 * Key Features:
 * - Deterministic shuffle (seeded by cardId) for FSRS stability
 * - Shared parentListId for all cards from same list
 * - Preserves list order via listPosition for future "List Health" views
 */

import type { MedicalListDetection } from '@/types/ai';

// ============================================================================
// Types
// ============================================================================

/** Processed list card ready for database insertion */
export interface ProcessedListCard {
  front: string; // Cloze with shuffled context
  back: string; // The answer item
  parentListId: string; // UUID shared by all cards from this list
  listPosition: number; // Original index (0-based)
  cardType: 'list-cloze';
}

// ============================================================================
// List Title Extraction
// ============================================================================

/**
 * Extract list title from content (first line or header).
 * Removes trailing colons and question marks.
 */
export function extractListTitle(content: string): string {
  const firstLine = content.split('\n')[0].trim();
  return firstLine.replace(/[:\?]$/, '').trim() || 'Medical List';
}

// ============================================================================
// Deterministic Shuffle (Seeded by CardId)
// ============================================================================

/**
 * Simple seeded random number generator for deterministic shuffling.
 * Uses Linear Congruential Generator (LCG) algorithm.
 */
function seededRandom(seed: string): () => number {
  // Convert string seed to numeric hash
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // LCG state
  let state = Math.abs(hash);
  
  return () => {
    // LCG: X(n+1) = (a * X(n) + c) mod m
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296; // Normalize to [0, 1)
  };
}

/**
 * Shuffle array using seeded random for deterministic results.
 * Same seed always produces same shuffle order.
 */
function seededShuffle<T>(array: T[], seed: string): T[] {
  const shuffled = [...array];
  const random = seededRandom(seed);
  
  // Fisher-Yates shuffle with seeded random
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

// ============================================================================
// Overlapping Cloze Generation
// ============================================================================

/**
 * Generate overlapping cloze card for a single list item.
 * Context items are shuffled deterministically to prevent pattern matching.
 * 
 * @param targetItem - The item to be cloze-deleted
 * @param targetIndex - Position in original list
 * @param allItems - All list items
 * @param listTitle - Title of the list
 * @param cardId - UUID for deterministic shuffle seeding
 * @returns Front and back card content
 */
export function generateOverlappingCloze(
  targetItem: string,
  targetIndex: number,
  allItems: string[],
  listTitle: string,
  cardId: string
): { front: string; back: string } {
  // Get sibling items (excluding target)
  const siblings = allItems.filter((_, i) => i !== targetIndex);
  
  // Shuffle siblings using cardId as seed (deterministic)
  const shuffledSiblings = seededShuffle(siblings, cardId);
  
  // Take 2-3 siblings for context (or all if list is small)
  const contextCount = Math.min(3, shuffledSiblings.length);
  const contextItems = shuffledSiblings.slice(0, contextCount);
  
  // Build cloze front
  // Format: "List title: {{c1::???}}, item2, item3, ..."
  const cloze = '{{c1::???}}';
  const contextStr = contextItems.join(', ');
  const ellipsis = siblings.length > contextCount ? ', ...' : '';
  
  const front = contextItems.length > 0
    ? `${listTitle}: ${cloze}, ${contextStr}${ellipsis}`
    : `${listTitle}: ${cloze}`;
  
  return { front, back: targetItem };
}

// ============================================================================
// List Processing
// ============================================================================

/**
 * Process a medical list into individual FSRS-ready cards.
 * Each item becomes its own card with shared parentListId.
 * 
 * @param content - Original pasted content
 * @param listDetection - AI detection result with parsed items
 * @returns Array of processed cards ready for database
 */
export function processMedicalList(
  content: string,
  listDetection: MedicalListDetection
): ProcessedListCard[] {
  const { items } = listDetection;
  
  if (items.length === 0) {
    return [];
  }
  
  const title = extractListTitle(content);
  const parentListId = crypto.randomUUID();
  
  // Single item becomes standard cloze card (no overlapping context needed)
  if (items.length === 1) {
    return [{
      front: `${title}: {{c1::???}}`,
      back: items[0],
      parentListId,
      listPosition: 0,
      cardType: 'list-cloze',
    }];
  }
  
  // Generate overlapping cloze for each item
  return items.map((item, index) => {
    // Generate cardId for deterministic shuffle
    const cardId = crypto.randomUUID();
    
    const { front, back } = generateOverlappingCloze(
      item,
      index,
      items,
      title,
      cardId
    );
    
    return {
      front,
      back,
      parentListId,
      listPosition: index,
      cardType: 'list-cloze' as const,
    };
  });
}

// ============================================================================
// Cloze Context Reshuffling (For Review Time)
// ============================================================================

/**
 * Re-shuffle cloze context items using cardId seed.
 * Used during review to show same shuffled context consistently.
 * 
 * @param front - Original front text with cloze
 * @param cardId - Card UUID for seeding
 * @returns Front text with re-shuffled context
 */
export function reshuffleClozeContext(front: string, cardId: string): string {
  // Parse: "List title: {{c1::???}}, item1, item2, ..."
  const match = front.match(/^(.+?):\s*(\{\{c1::[^}]*\}\}),\s*(.+?)(\.\.\.|$)/);
  
  if (!match) return front;
  
  const [, title, cloze, itemsStr, ellipsis] = match;
  const items = itemsStr.split(',').map(s => s.trim()).filter(Boolean);
  
  // Shuffle context items using same cardId seed
  const shuffled = seededShuffle(items, cardId);
  
  return `${title}: ${cloze}, ${shuffled.join(', ')}${ellipsis}`;
}
