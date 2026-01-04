import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Card, Note } from '@/types'
import { storageAdapter } from '@/lib/storage'

interface AppState {
  cards: Card[]
  notes: Note[]
  isHydrated: boolean
  isSeeded: boolean
}

interface AppActions {
  addCard: (card: Card) => void
  addNote: (note: Note) => void
  getCardsDueToday: () => Card[]
  setHydrated: () => void
  seedSampleData: () => void
}

type AppStore = AppState & AppActions

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      cards: [],
      notes: [],
      isHydrated: false,
      isSeeded: false,

      setHydrated: () => set({ isHydrated: true }),

      seedSampleData: () => {
        const { cards, isSeeded } = get()

        if (cards.length === 0 && !isSeeded) {
          import('@/data/sampleData').then(({ sampleNotes, sampleCards }) => {
            set({
              notes: sampleNotes,
              cards: sampleCards,
              isSeeded: true,
            })
          })
        }
      },

      addCard: (card: Card) => {
        if (!card.id || !card.front || !card.back) {
          console.error('Invalid card: missing required fields')
          return
        }
        set((state) => ({
          cards: [...state.cards, card],
        }))
      },

      addNote: (note: Note) => {
        if (!note.id || !note.title) {
          console.error('Invalid note: missing required fields')
          return
        }
        set((state) => ({
          notes: [...state.notes, note],
        }))
      },

      getCardsDueToday: () => {
        const today = new Date()
        const todayStr = today.toISOString().split('T')[0]

        return get().cards.filter((card) => {
          const cardDate = card.dueDate.split('T')[0]
          return cardDate === todayStr
        })
      },
    }),
    {
      name: 'doughub-storage',
      storage: createJSONStorage(() => storageAdapter),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
        state?.seedSampleData()
      },
    }
  )
)
