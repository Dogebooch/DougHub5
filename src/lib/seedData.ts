import { sampleNotes, sampleCards } from '@/data/sampleData'
import { CardWithFSRS, IpcResult, Note } from '@/types'

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

    // Insert cards with FSRS defaults
    for (const card of sampleCards) {
      const cardWithFSRS: CardWithFSRS = {
        ...card,
        ...DEFAULT_FSRS,
      }
      const cardResult: IpcResult<CardWithFSRS> = await window.api.cards.create(cardWithFSRS)
      if (cardResult.error) {
        console.error(`[Seed] Failed to insert card ${card.id}:`, cardResult.error)
        return { success: false, error: `Failed to insert card: ${cardResult.error}` }
      }
    }
    console.log(`[Seed] Inserted ${sampleCards.length} cards`)

    console.log('[Seed] Sample data seeded successfully')
    return { success: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Seed] Unexpected error:', message)
    return { success: false, error: message }
  }
}
