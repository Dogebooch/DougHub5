import { sampleNotes, sampleCards } from '@/data/sampleData'
import { CardWithFSRS, IpcResult, Note } from '@/types'

/**
 * FSRS state constants
 */
const FSRS_STATE = {
  NEW: 0,
  LEARNING: 1,
  REVIEW: 2,
  RELEARNING: 3,
  SUSPENDED: 4,
} as const

/**
 * Card-specific FSRS overrides to test various Card Browser features
 * Keys are card IDs, values are partial FSRS fields
 */
const CARD_FSRS_OVERRIDES: Record<string, Partial<CardWithFSRS>> = {
  // Leech card (high lapses, high difficulty)
  'card-troponin-001': {
    stability: 2.5,
    difficulty: 8.5,
    reps: 12,
    lapses: 9, // Leech threshold is typically 8+
    state: FSRS_STATE.RELEARNING,
    lastReview: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Another leech
  'card-stroke-002': {
    stability: 1.2,
    difficulty: 9.2,
    reps: 15,
    lapses: 11,
    state: FSRS_STATE.REVIEW,
    lastReview: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Suspended card
  'card-ef-001': {
    stability: 5.0,
    difficulty: 4.0,
    reps: 5,
    lapses: 1,
    state: FSRS_STATE.SUSPENDED,
    lastReview: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Learning state card
  'card-copd-001': {
    stability: 0.5,
    difficulty: 5.0,
    reps: 2,
    lapses: 0,
    state: FSRS_STATE.LEARNING,
    lastReview: new Date().toISOString(),
  },
  // Well-studied Review card
  'card-pe-001': {
    stability: 30.0,
    difficulty: 3.5,
    reps: 8,
    lapses: 0,
    state: FSRS_STATE.REVIEW,
    lastReview: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Another suspended
  'card-asthma-001': {
    stability: 10.0,
    difficulty: 6.0,
    reps: 4,
    lapses: 2,
    state: FSRS_STATE.SUSPENDED,
    lastReview: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
}

/**
 * Default FSRS values for new cards
 */
const DEFAULT_FSRS = {
  stability: 0,
  difficulty: 0,
  elapsedDays: 0,
  scheduledDays: 0,
  reps: 0,
  lapses: 0,
  state: 0, // 0 = New
  lastReview: null,
} as const

/**
 * Seeds the database with sample data if the cards table is empty.
 * Inserts notes first (cards reference noteId), then cards with FSRS defaults.
 * 
 * @returns Promise resolving to success/failure result
 */
export async function seedSampleData(): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if database already has cards
    const cardsResult: IpcResult<CardWithFSRS[]> = await window.api.cards.getAll()
    
    if (cardsResult.error) {
      console.error('[Seed] Failed to check existing cards:', cardsResult.error)
      return { success: false, error: cardsResult.error }
    }

    // Skip if cards already exist
    if (cardsResult.data && cardsResult.data.length > 0) {
      console.log('[Seed] Database already has cards, skipping seed')
      return { success: true }
    }

    console.log('[Seed] Database empty, seeding sample data...')

    // Insert notes first (cards reference noteId)
    for (const note of sampleNotes) {
      const noteResult: IpcResult<Note> = await window.api.notes.create(note)
      if (noteResult.error) {
        console.error(`[Seed] Failed to insert note ${note.id}:`, noteResult.error)
        return { success: false, error: `Failed to insert note: ${noteResult.error}` }
      }
    }
    console.log(`[Seed] Inserted ${sampleNotes.length} notes`)

    // Insert cards with FSRS defaults (with overrides for specific cards)
    for (const card of sampleCards) {
      const overrides = CARD_FSRS_OVERRIDES[card.id] || {}
      const cardWithFSRS: CardWithFSRS = {
        ...card,
        ...DEFAULT_FSRS,
        ...overrides,
      }
      const cardResult: IpcResult<CardWithFSRS> = await window.api.cards.create(cardWithFSRS)
      if (cardResult.error) {
        console.error(`[Seed] Failed to insert card ${card.id}:`, cardResult.error)
        return { success: false, error: `Failed to insert card: ${cardResult.error}` }
      }
    }
    console.log(`[Seed] Inserted ${sampleCards.length} cards (${Object.keys(CARD_FSRS_OVERRIDES).length} with custom FSRS states)`)

    console.log('[Seed] Sample data seeded successfully')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Seed] Unexpected error:', message)
    return { success: false, error: message }
  }
}
