/**
 * Cloze Renderer Component
 * 
 * Parses and renders cloze deletion syntax for flashcards.
 * Supports {{c1::answer}} and {{c1::answer::hint}} formats.
 * 
 * Features:
 * - Multiple cloze deletions per card
 * - Deterministic context reshuffling for list-cloze cards
 * - Clean blank rendering during question phase
 */

import { reshuffleClozeContext } from '@/lib/overlapping-cloze';

// ============================================================================
// Types
// ============================================================================

interface ClozePart {
  type: 'text' | 'cloze';
  content: string;
  hint?: string;
}

// ============================================================================
// Parser
// ============================================================================

/**
 * Parse cloze deletion syntax from card front text.
 * Supports: {{c1::answer}} and {{c1::answer::hint}}
 * 
 * @param text - Card front text with cloze deletions
 * @returns Array of text and cloze parts
 */
function parseClozeText(text: string): ClozePart[] {
  const parts: ClozePart[] = [];
  let lastIndex = 0;
  
  // Match {{c1::answer}} or {{c1::answer::hint}}
  const clozeRegex = /\{\{c\d+::([^:}]+)(?:::([^}]+))?\}\}/g;
  let match;
  
  while ((match = clozeRegex.exec(text)) !== null) {
    // Add text before the cloze
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }
    
    // Add the cloze deletion
    parts.push({
      type: 'cloze',
      content: match[1], // The answer
      hint: match[2],    // Optional hint
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after last cloze
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }
  
  // If no clozes found, return original text
  if (parts.length === 0) {
    parts.push({
      type: 'text',
      content: text,
    });
  }
  
  return parts;
}

// ============================================================================
// Components
// ============================================================================

interface ClozeDisplayProps {
  /** Card front text with cloze syntax */
  front: string;
  /** Whether to show answer or blank */
  revealed?: boolean;
  /** Card ID for deterministic reshuffling (list-cloze only) */
  cardId?: string;
  /** Card type to determine if reshuffling needed */
  cardType?: string;
}

/**
 * Display component for cloze deletions during review.
 * Shows blanks before answer reveal, full text after.
 */
export function ClozeDisplay({ front, revealed = false, cardId, cardType }: ClozeDisplayProps) {
  // Reshuffle context for list-cloze cards if cardId provided
  const displayText = cardType === 'list-cloze' && cardId 
    ? reshuffleClozeContext(front, cardId)
    : front;
  
  const parts = parseClozeText(displayText);
  
  return (
    <div className="text-3xl font-medium leading-relaxed">
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index}>{part.content}</span>;
        }
        
        // Cloze deletion
        if (revealed) {
          return (
            <span
              key={index}
              className="text-primary font-semibold underline decoration-2 underline-offset-4"
            >
              {part.content}
            </span>
          );
        }
        
        // Show blank with optional hint
        return (
          <span
            key={index}
            className="inline-block min-w-[3ch] px-3 py-1 mx-1 border-b-2 border-primary/50 text-primary/30"
            title={part.hint || undefined}
          >
            {part.hint ? `[${part.hint}]` : '[...]'}
          </span>
        );
      })}
    </div>
  );
}

interface ClozeAnswerProps {
  /** Card back text (the answer) */
  back: string;
}

/**
 * Display component for answer side of cloze cards.
 * Shows the clean answer text.
 */
export function ClozeAnswer({ back }: ClozeAnswerProps) {
  return (
    <div className="text-2xl leading-relaxed text-foreground/90">
      {back}
    </div>
  );
}

// ============================================================================
// Utility: Extract Plain Text
// ============================================================================

/**
 * Extract plain text from cloze syntax for display/search.
 * Removes all cloze markup and shows answers.
 * 
 * @param text - Text with cloze syntax
 * @returns Plain text with answers filled in
 */
export function clozeToPlainText(text: string): string {
  return text.replace(/\{\{c\d+::([^:}]+)(?:::[^}]+)?\}\}/g, '$1');
}

/**
 * Check if text contains cloze deletion syntax.
 */
export function hasClozeMarkers(text: string): boolean {
  return /\{\{c\d+::[^}]+\}\}/. test(text);
}
