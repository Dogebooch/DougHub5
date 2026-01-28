import { create } from "zustand";
import type { ClaudeDevMessage, ClaudeDevStatus, ElementInfo } from "@/types/dev";

interface ClaudeDevState {
  // Status
  status: ClaudeDevStatus | null;
  isLoading: boolean;
  
  // Messages
  messages: ClaudeDevMessage[];
  
  // Element picker
  isPickingElement: boolean;
  selectedElement: ElementInfo | null;
  
  // Screenshot
  currentScreenshot: string | null;
  
  // Actions
  fetchStatus: () => Promise<void>;
  sendMessage: (content: string, currentView: string) => Promise<void>;
  captureScreenshot: (rect?: { x: number; y: number; width: number; height: number }) => Promise<string | null>;
  clearMessages: () => Promise<void>;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  
  // Element picker actions
  setPickingElement: (isPicking: boolean) => void;
  setSelectedElement: (element: ElementInfo | null) => void;
  clearSelectedElement: () => void;
  
  // Screenshot actions
  setCurrentScreenshot: (screenshot: string | null) => void;
  
  // Internal
  addMessage: (message: ClaudeDevMessage) => void;
}

export const useClaudeDevStore = create<ClaudeDevState>((set, get) => ({
  // Initial state
  status: null,
  isLoading: false,
  messages: [],
  isPickingElement: false,
  selectedElement: null,
  currentScreenshot: null,

  fetchStatus: async () => {
    if (!window.api?.claudeDev) return;
    const res = await window.api.claudeDev.getStatus();
    if (res.data) {
      set({ status: res.data });
    }
  },

  sendMessage: async (content: string, currentView: string) => {
    if (!window.api?.claudeDev) return;
    
    const { currentScreenshot, selectedElement } = get();
    
    set({ isLoading: true });
    
    try {
      const res = await window.api.claudeDev.sendMessage(content, {
        screenshot: currentScreenshot ?? undefined,
        elementInfo: selectedElement ?? undefined,
        currentView,
      });
      
      if (res.error) {
        console.error("[ClaudeDev Store] Send error:", res.error);
      }
      
      // Clear screenshot and selected element after sending
      set({ 
        currentScreenshot: null, 
        selectedElement: null,
        isPickingElement: false,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  captureScreenshot: async (rect) => {
    if (!window.api?.claudeDev) return null;
    
    const res = await window.api.claudeDev.captureScreenshot(rect);
    if (res.data) {
      set({ currentScreenshot: res.data });
      return res.data;
    }
    return null;
  },

  clearMessages: async () => {
    if (!window.api?.claudeDev) return;
    await window.api.claudeDev.clearMessages();
    set({ messages: [] });
  },

  startSession: async () => {
    if (!window.api?.claudeDev) return;
    await window.api.claudeDev.startSession();
    set({ messages: [] });
  },

  endSession: async () => {
    if (!window.api?.claudeDev) return;
    await window.api.claudeDev.endSession();
    set({ messages: [], currentScreenshot: null, selectedElement: null });
  },

  setPickingElement: (isPicking) => set({ isPickingElement: isPicking }),
  
  setSelectedElement: (element) => set({ 
    selectedElement: element, 
    isPickingElement: false 
  }),
  
  clearSelectedElement: () => set({ selectedElement: null }),
  
  setCurrentScreenshot: (screenshot) => set({ currentScreenshot: screenshot }),

  addMessage: (message) => {
    set((state) => {
      // Check if message already exists (avoid duplicates from IPC)
      const exists = state.messages.some((m) => m.id === message.id);
      if (exists) return state;
      return { messages: [...state.messages, message] };
    });
  },
}));

// Subscribe to IPC messages
if (typeof window !== "undefined" && window.api?.claudeDev?.onMessage) {
  window.api.claudeDev.onMessage((message) => {
    useClaudeDevStore.getState().addMessage(message);
  });
}
