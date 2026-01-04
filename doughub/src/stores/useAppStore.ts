import { create } from 'zustand'
import { Card, Note, CardWithFSRS, IpcResult } from '@/types'
import { seedSampleData } from '@/lib/seedData'

// View types for navigation
export type AppView = 'capture' | 'review' | 'settings'

interface AppState {
  cards: Card[]
  notes: Note[]
  isHydrated: boolean
  isSeeded: boolean
  isLoading: boolean
  currentView: AppView
}

interface AppActions {
  addCard: (card: CardWithFSRS) => Promise<{ success: boolean; error?: string }>
  updateCard: (card: CardWithFSRS) => Promise<{ success: boolean; error?: string }>
  deleteCard: (id: string) => Promise<{ success: boolean; error?: string }>
  addNote: (note: Note) => Promise<{ success: boolean; error?: string }>
  updateNote: (note: Note) => Promise<{ success: boolean; error?: string }>
  deleteNote: (id: string) => Promise<{ success: boolean; error?: string }>
  getCardsDueToday: () => Card[]
  setHydrated: () => void
  seedSampleData: () => void
  setCurrentView: (view: AppView) => void
  initialize: () => Promise<void>
}

type AppStore = AppState & AppActions

export const useAppStore = create<AppStore>()((set, get) => ({
  cards: [],
  notes: [],
  isHydrated: false,
  isSeeded: false,
  isLoading: true,
  currentView: 'capture',

  setCurrentView: (view: AppView) => set({ currentView: view }),

  setHydrated: () => set({ isHydrated: true }),

  initialize: async () => {
    // Skip if already hydrated
    if (get().isHydrated) return

    set({ isLoading: true })
    
    try {
      // Check if window.api exists (Electron environment)
      if (typeof window !== 'undefined' && window.api) {
        // Seed sample data if database is empty
        const seedResult = await seedSampleData()
        if (!seedResult.success) {
          console.error('[Store] Seed failed:', seedResult.error)
        }

        // Load cards from database
        const cardsResult: IpcResult<CardWithFSRS[]> = await window.api.cards.getAll()
        if (cardsResult.error) {
          console.error('[Store] Failed to load cards:', cardsResult.error)
        }

        // Load notes from database
        const notesResult: IpcResult<Note[]> = await window.api.notes.getAll()
        if (notesResult.error) {
          console.error('[Store] Failed to load notes:', notesResult.error)
        }

        set({
          cards: cardsResult.data ?? [],
          notes: notesResult.data ?? [],
          isSeeded: true,
          isHydrated: true,
          isLoading: false,
        })

        console.log('[Store] Initialized with', cardsResult.data?.length ?? 0, 'cards and', notesResult.data?.length ?? 0, 'notes')
      } else {
        // Fallback for non-Electron environment (dev/testing)
        console.warn('[Store] window.api not available, using in-memory sample data')
        get().seedSampleData()
        set({ isLoading: false })
      }
    } catch (error) {
      console.error('[Store] Initialization error:', error)
      // Fallback to sample data on error
      get().seedSampleData()
      set({ isLoading: false, isHydrated: true })
    }
  },

  seedSampleData: () => {
    const { cards, isSeeded } = get()

    if (cards.length === 0 && !isSeeded) {
      import('@/data/sampleData').then(({ sampleNotes, sampleCards }) => {
        set({
          notes: sampleNotes,
          cards: sampleCards,
          isSeeded: true,
          isHydrated: true,
        })
      })
    }
  },

  addCard: async (card: CardWithFSRS) => {
    if (!card.id || !card.front || !card.back) {
      console.error('Invalid card: missing required fields')
      return { success: false, error: 'Missing required fields' }
    }
    
    try {
      // Persist to SQLite first
      if (typeof window !== 'undefined' && window.api) {
        const result = await window.api.cards.create(card)
        if (result.error) {
          console.error('[Store] Failed to save card:', result.error)
          return { success: false, error: result.error }
        }
      }
      
      // Update local state on success
      set((state) => ({
        cards: [...state.cards, card],
      }))
      
      return { success: true }
    } catch (error) {
      console.error('[Store] Error adding card:', error)
      return { success: false, error: String(error) }
    }
  },

  updateCard: async (card: CardWithFSRS) => {
    try {
      if (typeof window !== 'undefined' && window.api) {
        const result = await window.api.cards.update(card)
        if (result.error) {
          console.error('[Store] Failed to update card:', result.error)
          return { success: false, error: result.error }
        }
      }
      
      set((state) => ({
        cards: state.cards.map((c) => c.id === card.id ? card : c),
      }))
      
      return { success: true }
    } catch (error) {
      console.error('[Store] Error updating card:', error)
      return { success: false, error: String(error) }
    }
  },

  deleteCard: async (id: string) => {
    try {
      if (typeof window !== 'undefined' && window.api) {
        const result = await window.api.cards.delete(id)
        if (result.error) {
          console.error('[Store] Failed to delete card:', result.error)
          return { success: false, error: result.error }
        }
      }
      
      set((state) => ({
        cards: state.cards.filter((c) => c.id !== id),
      }))
      
      return { success: true }
    } catch (error) {
      console.error('[Store] Error deleting card:', error)
      return { success: false, error: String(error) }
    }
  },

  addNote: async (note: Note) => {
    if (!note.id || !note.title) {
      console.error('Invalid note: missing required fields')
      return { success: false, error: 'Missing required fields' }
    }
    
    try {
      if (typeof window !== 'undefined' && window.api) {
        const result = await window.api.notes.create(note)
        if (result.error) {
          console.error('[Store] Failed to save note:', result.error)
          return { success: false, error: result.error }
        }
      }
      
      set((state) => ({
        notes: [...state.notes, note],
      }))
      
      return { success: true }
    } catch (error) {
      console.error('[Store] Error adding note:', error)
      return { success: false, error: String(error) }
    }
  },

  updateNote: async (note: Note) => {
    try {
      if (typeof window !== 'undefined' && window.api) {
        const result = await window.api.notes.update(note)
        if (result.error) {
          console.error('[Store] Failed to update note:', result.error)
          return { success: false, error: result.error }
        }
      }
      
      set((state) => ({
        notes: state.notes.map((n) => n.id === note.id ? note : n),
      }))
      
      return { success: true }
    } catch (error) {
      console.error('[Store] Error updating note:', error)
      return { success: false, error: String(error) }
    }
  },

  deleteNote: async (id: string) => {
    try {
      if (typeof window !== 'undefined' && window.api) {
        const result = await window.api.notes.delete(id)
        if (result.error) {
          console.error('[Store] Failed to delete note:', result.error)
          return { success: false, error: result.error }
        }
      }
      
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
      }))
      
      return { success: true }
    } catch (error) {
      console.error('[Store] Error deleting note:', error)
      return { success: false, error: String(error) }
    }
  },

  getCardsDueToday: () => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    return get().cards.filter((card) => {
      const cardDate = card.dueDate.split('T')[0]
      return cardDate === todayStr
    })
  },
}))
