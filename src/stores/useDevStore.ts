import { create } from 'zustand';
import { AILogEntry } from '@/types/dev';
import { AIProviderStatus } from "@/types/ai";

interface DevState {
  isOpen: boolean;
  logs: AILogEntry[];
  settings: Record<string, string>;
  backendStatus: AIProviderStatus | null;

  togglePanel: () => void;
  setOpen: (open: boolean) => void;
  addLog: (log: AILogEntry) => void;
  clearLogs: () => void;
  fetchSettings: () => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;
  fetchBackendStatus: () => Promise<void>;
}

export const useDevStore = create<DevState>((set, get) => ({
  isOpen: false,
  logs: [],
  settings: {},
  backendStatus: null,

  togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (open) => set({ isOpen: open }),

  addLog: (log) =>
    set((state) => {
      const existingIndex = state.logs.findIndex((l) => l.id === log.id);

      if (existingIndex !== -1) {
        // Update existing log (e.g. pending -> success)
        const updatedLogs = [...state.logs];
        updatedLogs[existingIndex] = {
          ...updatedLogs[existingIndex],
          ...log,
          // Preserve request if not present in update
          request: log.request || updatedLogs[existingIndex].request,
        };
        return { logs: updatedLogs };
      }

      // New log entry - add to top (max 50)
      return { logs: [log, ...state.logs].slice(0, 50) };
    }),

  clearLogs: () => set({ logs: [] }),

  fetchSettings: async () => {
    if (!window.api?.dev) return; // Guard for prod/missing api
    const res = await window.api.dev.getSettings();
    if (res.error) {
      console.error("Failed to fetch dev settings", res.error);
      return;
    }
    if (res.data) {
      set({ settings: res.data });
    }
  },

  updateSetting: async (key, value) => {
    if (!window.api?.dev) return;
    // Optimistic update
    set((state) => ({ settings: { ...state.settings, [key]: value } }));
    await window.api.dev.updateSetting(key, value);
    // Refresh backend status as settings might affect it (model, etc)
    get().fetchBackendStatus();
  },

  fetchBackendStatus: async () => {
    if (!window.api?.ai?.getProviderStatus) return;
    const res = await window.api.ai.getProviderStatus();
    if (res.data) {
      set({ backendStatus: res.data });
    }
  },
}));
