import { create } from 'zustand'
import {
  Note,
  CardWithFSRS,
  IpcResult,
  RatingValue,
  ScheduleResult,
  AppView,
} from "@/types";
import { seedSampleData } from "@/lib/seedData";

interface AppState {
  cards: CardWithFSRS[];
  notes: Note[];
  isHydrated: boolean;
  isSeeded: boolean;
  isLoading: boolean;
  currentView: AppView;
  selectedItemId: string | null;
  inboxCount: number;
  queueCount: number;
  smartViewCounts: Record<string, number>;
  selectedInboxItems: Set<string>;
}

interface AppActions {
  addCard: (
    card: CardWithFSRS
  ) => Promise<{ success: boolean; error?: string }>;
  updateCard: (
    card: CardWithFSRS
  ) => Promise<{ success: boolean; error?: string }>;
  deleteCard: (id: string) => Promise<{ success: boolean; error?: string }>;
  addNote: (note: Note) => Promise<{ success: boolean; error?: string }>;
  updateNote: (note: Note) => Promise<{ success: boolean; error?: string }>;
  deleteNote: (id: string) => Promise<{ success: boolean; error?: string }>;
  getCardsDueToday: () => CardWithFSRS[];
  scheduleCardReview: (
    cardId: string,
    rating: RatingValue
  ) => Promise<{ success: boolean; data?: ScheduleResult; error?: string }>;
  setHydrated: () => void;
  seedSampleData: () => void;
  setCurrentView: (view: AppView, itemId?: string | null) => void;
  initialize: () => Promise<void>;
  refreshCounts: () => Promise<void>;
  refreshSmartViewCounts: () => Promise<void>;

  // Inbox Batch Actions
  toggleInboxSelection: (id: string) => void;
  selectAllInbox: (ids: string[]) => void;
  clearInboxSelection: () => void;
  batchAddToNotebook: (
    itemIds: string[],
    topicId: string
  ) => Promise<{ success: boolean; error?: string }>;
  batchDeleteInbox: (
    itemIds: string[]
  ) => Promise<{ success: boolean; error?: string }>;
}

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>()((set, get) => ({
  cards: [],
  notes: [],
  isHydrated: false,
  isSeeded: false,
  isLoading: true,
  currentView: "capture",
  selectedItemId: null,
  inboxCount: 0,
  queueCount: 0,
  smartViewCounts: {
    inbox: 0,
    notebook: 0,
  },
  selectedInboxItems: new Set<string>(),

  setCurrentView: (view: AppView, itemId: string | null = null) =>
    set({ currentView: view, selectedItemId: itemId }),

  refreshSmartViewCounts: async () => {
    if (typeof window !== "undefined" && window.api) {
      const itemsResult = await window.api.sourceItems.getAll();
      if (!itemsResult.error && itemsResult.data) {
        const items = itemsResult.data;
        const counts = {
          inbox: items.filter((i) => i.status === "inbox").length,
          notebook: 0, // Placeholder
        };
        set({ smartViewCounts: counts });
      }
    }
  },

  refreshCounts: async () => {
    if (typeof window !== "undefined" && window.api) {
      const statusResult = await window.api.db.status();
      if (!statusResult.error) {
        set({
          inboxCount: statusResult.data.inboxCount,
          queueCount: statusResult.data.queueCount,
        });
      }
      await get().refreshSmartViewCounts();
    }
  },

  setHydrated: () => set({ isHydrated: true }),

  initialize: async () => {
    // Skip if already hydrated
    if (get().isHydrated) return;

    set({ isLoading: true });

    try {
      // Check if window.api exists (Electron environment)
      if (typeof window !== "undefined" && window.api) {
        // Seed sample data if database is empty
        const seedResult = await seedSampleData();
        if (!seedResult.success) {
          console.error("[Store] Seed failed:", seedResult.error);
        }

        // Load cards from database
        const cardsResult: IpcResult<CardWithFSRS[]> =
          await window.api.cards.getAll();
        if (cardsResult.error) {
          console.error("[Store] Failed to load cards:", cardsResult.error);
        }

        // Load notes from database
        const notesResult: IpcResult<Note[]> = await window.api.notes.getAll();
        if (notesResult.error) {
          console.error("[Store] Failed to load notes:", notesResult.error);
        }

        // Refresh counts
        const statusResult = await window.api.db.status();
        const inboxCount = statusResult.data?.inboxCount ?? 0;
        const queueCount = statusResult.data?.queueCount ?? 0;

        set({
          cards: cardsResult.data ?? [],
          notes: notesResult.data ?? [],
          inboxCount,
          queueCount,
          isSeeded: true,
          isHydrated: true,
          isLoading: false,
        });

        console.log(
          "[Store] Initialized with",
          cardsResult.data?.length ?? 0,
          "cards,",
          notesResult.data?.length ?? 0,
          "notes, and",
          inboxCount,
          "inbox items"
        );
      } else {
        // Fallback for non-Electron environment (dev/testing)
        console.warn(
          "[Store] window.api not available, using in-memory sample data"
        );
        get().seedSampleData();
        set({ isLoading: false });
      }
    } catch (error) {
      console.error("[Store] Initialization error:", error);
      // Fallback to sample data on error
      get().seedSampleData();
      set({ isLoading: false, isHydrated: true });
    }
  },

  seedSampleData: () => {
    const { cards, isSeeded } = get();

    if (cards.length === 0 && !isSeeded) {
      import("@/data/sampleData").then(({ sampleNotes, sampleCards }) => {
        // Add default FSRS fields for in-memory fallback
        const cardsWithFSRS: CardWithFSRS[] = sampleCards.map((card) => ({
          ...card,
          stability: 0,
          difficulty: 0,
          elapsedDays: 0,
          scheduledDays: 0,
          reps: 0,
          lapses: 0,
          state: 0,
          lastReview: null,
        }));
        set({
          notes: sampleNotes,
          cards: cardsWithFSRS,
          isSeeded: true,
          isHydrated: true,
        });
      });
    }
  },

  addCard: async (card: CardWithFSRS) => {
    if (!card.id || !card.front || !card.back) {
      console.error("Invalid card: missing required fields");
      return { success: false, error: "Missing required fields" };
    }

    try {
      // Persist to SQLite first
      if (typeof window !== "undefined" && window.api) {
        const result = await window.api.cards.create(card);
        if (result.error) {
          console.error("[Store] Failed to save card:", result.error);
          return { success: false, error: result.error };
        }
      }

      // Update local state on success
      set((state) => ({
        cards: [...state.cards, card],
      }));

      return { success: true };
    } catch (error) {
      console.error("[Store] Error adding card:", error);
      return { success: false, error: String(error) };
    }
  },

  updateCard: async (card: CardWithFSRS) => {
    try {
      if (typeof window !== "undefined" && window.api) {
        const result = await window.api.cards.update(card.id, card);
        if (result.error) {
          console.error("[Store] Failed to update card:", result.error);
          return { success: false, error: result.error };
        }
      }

      set((state) => ({
        cards: state.cards.map((c) => (c.id === card.id ? card : c)),
      }));

      return { success: true };
    } catch (error) {
      console.error("[Store] Error updating card:", error);
      return { success: false, error: String(error) };
    }
  },

  deleteCard: async (id: string) => {
    try {
      if (typeof window !== "undefined" && window.api) {
        const result = await window.api.cards.remove(id);
        if (result.error) {
          console.error("[Store] Failed to delete card:", result.error);
          return { success: false, error: result.error };
        }
      }

      set((state) => ({
        cards: state.cards.filter((c) => c.id !== id),
      }));

      return { success: true };
    } catch (error) {
      console.error("[Store] Error deleting card:", error);
      return { success: false, error: String(error) };
    }
  },

  addNote: async (note: Note) => {
    if (!note.id || !note.title) {
      console.error("Invalid note: missing required fields");
      return { success: false, error: "Missing required fields" };
    }

    try {
      if (typeof window !== "undefined" && window.api) {
        const result = await window.api.notes.create(note);
        if (result.error) {
          console.error("[Store] Failed to save note:", result.error);
          return { success: false, error: result.error };
        }
      }

      set((state) => ({
        notes: [...state.notes, note],
      }));

      return { success: true };
    } catch (error) {
      console.error("[Store] Error adding note:", error);
      return { success: false, error: String(error) };
    }
  },

  updateNote: async (note: Note) => {
    try {
      if (typeof window !== "undefined" && window.api) {
        const result = await window.api.notes.update(note.id, note);
        if (result.error) {
          console.error("[Store] Failed to update note:", result.error);
          return { success: false, error: result.error };
        }
      }

      set((state) => ({
        notes: state.notes.map((n) => (n.id === note.id ? note : n)),
      }));

      return { success: true };
    } catch (error) {
      console.error("[Store] Error updating note:", error);
      return { success: false, error: String(error) };
    }
  },

  deleteNote: async (id: string) => {
    try {
      if (typeof window !== "undefined" && window.api) {
        const result = await window.api.notes.remove(id);
        if (result.error) {
          console.error("[Store] Failed to delete note:", result.error);
          return { success: false, error: result.error };
        }
      }

      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
      }));

      return { success: true };
    } catch (error) {
      console.error("[Store] Error deleting note:", error);
      return { success: false, error: String(error) };
    }
  },

  getCardsDueToday: () => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    return get().cards.filter((card) => {
      const cardDate = card.dueDate.split("T")[0];
      return cardDate <= todayStr;
    });
  },

  scheduleCardReview: async (
    cardId: string,
    rating: RatingValue,
    responseTimeMs?: number | null
  ) => {
    try {
      if (typeof window !== "undefined" && window.api) {
        const result = await window.api.reviews.schedule(
          cardId,
          rating,
          responseTimeMs
        );
        if (result.error) {
          console.error("[Store] Failed to schedule review:", result.error);
          return { success: false, error: result.error };
        }

        // Update local state with the new card data
        set((state) => ({
          cards: state.cards.map((c) =>
            c.id === cardId ? result.data!.card : c
          ),
        }));

        return { success: true, data: result.data! };
      }

      // Browser mode: simulate scheduling with updated due date
      console.log("[Store] Browser mode: simulating review schedule");
      const card = get().cards.find((c) => c.id === cardId);
      if (!card) {
        return { success: false, error: "Card not found" };
      }

      // Simple browser mode scheduling - just push due date forward
      const daysToAdd = rating >= 3 ? 3 : 1;
      const newDueDate = new Date();
      newDueDate.setDate(newDueDate.getDate() + daysToAdd);

      const updatedCard: CardWithFSRS = {
        ...card,
        dueDate: newDueDate.toISOString(),
        reps: card.reps + 1,
        lastReview: new Date().toISOString(),
      };

      set((state) => ({
        cards: state.cards.map((c) => (c.id === cardId ? updatedCard : c)),
      }));

      return {
        success: true,
        data: { card: updatedCard, log: null },
      };
    } catch (error) {
      console.error("[Store] Error scheduling review:", error);
      return { success: false, error: String(error) };
    }
  },

  toggleInboxSelection: (id: string) => {
    set((state) => {
      const next = new Set(state.selectedInboxItems);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedInboxItems: next };
    });
  },

  selectAllInbox: (ids: string[]) => {
    set({ selectedInboxItems: new Set(ids) });
  },

  clearInboxSelection: () => {
    set({ selectedInboxItems: new Set() });
  },

  batchAddToNotebook: async (itemIds: string[], topicId: string) => {
    try {
      if (typeof window !== "undefined" && window.api) {
        // Execute batch updates with individual error tracking
        const results = await Promise.allSettled(
          itemIds.map((id) =>
            window.api.sourceItems.update(id, {
              status: "processed",
              canonicalTopicIds: [topicId],
              updatedAt: new Date().toISOString(),
            })
          )
        );

        // Log individual failures
        const failures = results.filter((r) => r.status === "rejected");
        if (failures.length > 0) {
          console.error(
            `[Store] batchAddToNotebook: ${failures.length}/${itemIds.length} items failed`,
            failures
          );
        }

        // Refresh counts and clear selection
        await get().refreshCounts();
        get().clearInboxSelection();

        const successCount = results.filter(
          (r) => r.status === "fulfilled"
        ).length;
        return {
          success: successCount > 0,
          error:
            failures.length > 0
              ? `${failures.length} items failed to update`
              : undefined,
        };
      }
      return { success: false, error: "window.api not available" };
    } catch (error) {
      console.error("[Store] batchAddToNotebook error:", error);
      return { success: false, error: String(error) };
    }
  },

  batchDeleteInbox: async (itemIds: string[]) => {
    try {
      if (typeof window !== "undefined" && window.api) {
        // Execute batch deletions with individual error tracking
        const results = await Promise.allSettled(
          itemIds.map((id) => window.api.sourceItems.delete(id))
        );

        // Log individual failures
        const failures = results.filter((r) => r.status === "rejected");
        if (failures.length > 0) {
          console.error(
            `[Store] batchDeleteInbox: ${failures.length}/${itemIds.length} items failed`,
            failures
          );
        }

        // Refresh counts and clear selection
        await get().refreshCounts();
        get().clearInboxSelection();

        const successCount = results.filter(
          (r) => r.status === "fulfilled"
        ).length;
        return {
          success: successCount > 0,
          error:
            failures.length > 0
              ? `${failures.length} items failed to delete`
              : undefined,
        };
      }
      return { success: false, error: "window.api not available" };
    } catch (error) {
      console.error("[Store] batchDeleteInbox error:", error);
      return { success: false, error: String(error) };
    }
  },
}));
