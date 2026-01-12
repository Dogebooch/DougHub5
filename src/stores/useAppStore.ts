import { create } from 'zustand'
import {
  Note,
  CardWithFSRS,
  CardBrowserItem,
  IpcResult,
  RatingValue,
  ScheduleResult,
  AppView,
  AppSettings,
} from "@/types";
import { seedSampleData } from "@/lib/seedData";
import { getWindowApi } from "@/lib/safeWindowApi";

const DEFAULT_SETTINGS: AppSettings = {
  aiProvider: "openai",
  openaiApiKey: "",
  anthropicApiKey: "",
  ollamaModel: "llama3",
  openaiModel: "gpt-4o",
  anthropicModel: "claude-3-5-sonnet-20240620",
  fsrsRequestRetention: 0.89,
};

interface AppState {
  cards: CardWithFSRS[];
  notes: Note[];
  isHydrated: boolean;
  isSeeded: boolean;
  isLoading: boolean;
  currentView: AppView;
  selectedItemId: string | null;
  viewOptions?: {
    filter?: string;
    topicId?: string;
  };
  inboxCount: number;
  queueCount: number;
  smartViewCounts: Record<string, number>;
  selectedInboxItems: Set<string>;
  userDataPath: string | null;
  settings: AppSettings;
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
  deleteNotebookPage: (
    id: string
  ) => Promise<{ success: boolean; error?: string }>;
  getCardsDueToday: () => CardWithFSRS[];
  scheduleCardReview: (
    cardId: string,
    rating: RatingValue,
    responseTimeMs?: number | null
  ) => Promise<{ success: boolean; data?: ScheduleResult; error?: string }>;
  setHydrated: () => void;
  seedSampleData: () => void;
  setCurrentView: (
    view: AppView,
    itemId?: string | null,
    options?: AppState["viewOptions"]
  ) => void;
  initialize: () => Promise<void>;
  refreshCounts: () => Promise<void>;
  refreshSmartViewCounts: () => Promise<void>;
  onNewSourceItem: () => void;
  getBrowserList: (
    filters?: {
      status?: number[];
      topicId?: string;
      tags?: string[];
      leechesOnly?: boolean;
      search?: string;
    },
    sort?: {
      field: "dueDate" | "createdAt" | "difficulty" | "lastReview";
      direction: "asc" | "desc";
    }
  ) => Promise<CardBrowserItem[]>;

  // Settings Actions
  updateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => Promise<void>;
  loadSettings: () => Promise<void>;

  // Inbox Batch Actions
  toggleInboxSelection: (id: string) => void;
  addToInboxSelection: (ids: string[]) => void;
  removeFromInboxSelection: (ids: string[]) => void;
  selectAllInbox: (ids: string[]) => void;
  clearInboxSelection: () => void;
  batchAddToNotebook: (
    itemIds: string[],
    topicId: string
  ) => Promise<{ success: boolean; error?: string }>;
  batchDeleteInbox: (
    itemIds: string[]
  ) => Promise<{ success: boolean; error?: string }>;
  purgeRawPages: () => Promise<{ success: boolean; error?: string }>;
}

type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>()((set, get) => ({
  cards: [],
  notes: [],
  isHydrated: false,
  isSeeded: false,
  isLoading: true,
  currentView: "inbox",
  selectedItemId: null,
  inboxCount: 0,
  queueCount: 0,
  smartViewCounts: {
    inbox: 0,
    notebook: 0,
    weak: 0,
  },
  selectedInboxItems: new Set<string>(),
  userDataPath: null,
  settings: DEFAULT_SETTINGS,

  setCurrentView: (view, itemId = null, options = undefined) =>
    set({ currentView: view, selectedItemId: itemId, viewOptions: options }),

  refreshSmartViewCounts: async () => {
    if (typeof window !== "undefined" && window.api) {
      const statusResult = await window.api.db.status();
      if (statusResult.error) {
        console.error(
          "[Store] Failed to refresh smart view counts:",
          statusResult.error
        );
        return;
      }

      if (statusResult.data) {
        set({
          smartViewCounts: {
            inbox: statusResult.data.inboxCount,
            notebook: statusResult.data.notebookCount,
            weak: statusResult.data.weakTopicsCount,
          },
        });
      }
    }
  },

  loadSettings: async () => {
    if (typeof window !== "undefined" && window.api) {
      try {
        const result = await window.api.settings.getAll();
        if (result.error) {
          console.error("[Store] Failed to load settings:", result.error);
          return;
        }

        if (result.data) {
          const dbSettings = result.data;
          const currentSettings = { ...get().settings };

          dbSettings.forEach((s) => {
            const key = s.key as keyof AppSettings;
            if (key in currentSettings) {
              // Basic type conversion using type assertion
              const existingValue = currentSettings[key];
              if (typeof existingValue === "number") {
                const parsed = Number.parseFloat(s.value);
                (currentSettings as Record<string, unknown>)[key] =
                  Number.isNaN(parsed) ? existingValue : parsed;
              } else {
                (currentSettings as Record<string, unknown>)[key] = s.value;
              }
            }
          });

          set({ settings: currentSettings });
        }
      } catch (error) {
        console.error("[Store] Exception loading settings:", error);
      }
    }
  },

  updateSetting: async (key, value) => {
    if (typeof window !== "undefined" && window.api) {
      try {
        // Save to DB
        const stringValue = typeof value === "string" ? value : String(value);
        const result = await window.api.settings.set(key, stringValue);

        if (result?.error) {
          console.error(
            `[Store] Failed to update setting ${key}:`,
            result.error
          );
          return;
        }

        // Update local state
        set((state) => ({
          settings: {
            ...state.settings,
            [key]: value,
          },
        }));
      } catch (error) {
        console.error(`[Store] Exception updating setting ${key}:`, error);
      }
    }
  },

  refreshCounts: async () => {
    if (typeof window !== "undefined" && window.api) {
      const statusResult = await window.api.db.status();
      if (statusResult.error) {
        console.error("[Store] Failed to refresh counts:", statusResult.error);
        return;
      }

      if (statusResult.data) {
        const data = statusResult.data;
        set({
          inboxCount: data.inboxCount,
          queueCount: data.queueCount,
          smartViewCounts: {
            inbox: data.inboxCount,
            notebook: data.notebookCount,
            weak: data.weakTopicsCount,
          },
        });
      }
    }
  },

  onNewSourceItem: () => {
    // Refresh counts and smart view counts in background
    get().refreshCounts();
  },

  setHydrated: () => set({ isHydrated: true }),

  initialize: async () => {
    // Skip if already hydrated
    if (get().isHydrated) return;

    set({ isLoading: true });

    try {
      // Check if window.api exists (Electron environment)
      if (typeof window !== "undefined" && window.api) {
        // Load settings first as other things might depend on them
        await get().loadSettings();

        // Get database status first (single efficient query)
        const statusResult = await window.api.db.status();
        if (statusResult.error) {
          console.error("[Store] Database status failed:", statusResult.error);
        }

        const {
          cardCount = 0,
          inboxCount = 0,
          queueCount = 0,
          notebookCount = 0,
          weakTopicsCount = 0,
        } = statusResult.data || {};

        // Only seed sample data in development mode if database is empty
        if (import.meta.env.DEV && cardCount === 0) {
          const seedResult = await seedSampleData(cardCount);
          if (!seedResult.success) {
            console.error("[Store] Seed failed:", seedResult.error);
          }
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

        // Use new app API to get userData path for images
        let userDataPath: string | null = null;
        const userDataResult = await window.api.app.getUserDataPath();
        if (userDataResult.data) {
          userDataPath = userDataResult.data;
        }

        set({
          cards: cardsResult.data ?? [],
          notes: notesResult.data ?? [],
          userDataPath,
          inboxCount,
          queueCount,
          smartViewCounts: {
            inbox: inboxCount,
            notebook: notebookCount,
            weak: weakTopicsCount,
          },
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

  getBrowserList: async (
    filters?: {
      status?: number[];
      topicId?: string;
      tags?: string[];
      leechesOnly?: boolean;
      search?: string;
    },
    sort?: {
      field: "dueDate" | "createdAt" | "difficulty" | "lastReview";
      direction: "asc" | "desc";
    }
  ) => {
    const api = getWindowApi();
    if (!api) {
      console.warn("[Store] window.api unavailable - browser list skipped");
      return [];
    }

    const result = await api.cards.getBrowserList(filters, sort);
    if (result.error) {
      console.error("[Store] Failed to get browser list:", result.error);
      return [];
    }
    return result.data || [];
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
        data: {
          card: updatedCard,
          reviewLog: {
            id: "browser-mock-log",
            cardId: updatedCard.id,
            rating: rating,
            state: updatedCard.state,
            scheduledDays: daysToAdd,
            elapsedDays: 0,
            review: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
          intervals: { again: 1, hard: 2, good: 3, easy: 4 },
        },
      };
    } catch (error) {
      console.error("[Store] Error scheduling review:", error);
      return { success: false, error: String(error) };
    }
  },

  deleteNotebookPage: async (id: string) => {
    try {
      if (typeof window !== "undefined" && window.api) {
        const result = await window.api.notebookPages.delete(id);
        if (result.error) {
          console.error(
            "[Store] Failed to delete notebook page:",
            result.error
          );
          return { success: false, error: result.error };
        }
      }

      // Update local state: remove cards that belonged to this page if they are in store
      set((state) => ({
        cards: state.cards.filter((c) => c.notebookTopicPageId !== id),
      }));

      // Refresh counts and smart view counts
      await get().refreshCounts();

      return { success: true };
    } catch (error) {
      console.error("[Store] Error deleting notebook page:", error);
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

  addToInboxSelection: (ids: string[]) => {
    set((state) => {
      const next = new Set(state.selectedInboxItems);
      ids.forEach((id) => next.add(id));
      return { selectedInboxItems: next };
    });
  },

  removeFromInboxSelection: (ids: string[]) => {
    set((state) => {
      const next = new Set(state.selectedInboxItems);
      ids.forEach((id) => next.delete(id));
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

  purgeRawPages: async () => {
    try {
      if (
        typeof window !== "undefined" &&
        window.api?.sourceItems?.purgeRawPages
      ) {
        const result = await window.api.sourceItems.purgeRawPages();
        if (result.error) {
          console.error("[Store] purgeRawPages failed:", result.error);
          return { success: false, error: result.error };
        }
        return { success: true };
      }
      return { success: false, error: "window.api not available" };
    } catch (error) {
      console.error("[Store] purgeRawPages error:", error);
      return { success: false, error: String(error) };
    }
  },
}));
