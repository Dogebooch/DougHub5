import localforage from 'localforage'

export const storage = localforage.createInstance({
  name: 'doughub-storage',
  driver: [
    localforage.INDEXEDDB,
    localforage.WEBSQL,
    localforage.LOCALSTORAGE,
  ],
  description: 'DougHub flashcard and notes storage',
})

export const STORAGE_KEYS = {
  CARDS: 'cards',
  NOTES: 'notes',
} as const

export const storageAdapter = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const value = await storage.getItem<string>(name)
      return value || null
    } catch (error) {
      console.error('Error reading from storage:', error)
      return null
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await storage.setItem(name, value)
    } catch (error) {
      console.error('Error writing to storage:', error)
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await storage.removeItem(name)
    } catch (error) {
      console.error('Error removing from storage:', error)
    }
  },
}
