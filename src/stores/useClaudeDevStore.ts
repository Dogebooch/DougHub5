import { create } from "zustand";
import type {
  ClaudeDevMessage,
  ClaudeDevStatus,
  ElementInfo,
  ClaudeModel,
  SessionStats,
  SavedConversation,
  StreamChunk,
} from "@/types/dev";

interface ClaudeDevState {
  // Status
  status: ClaudeDevStatus | null;
  isLoading: boolean;

  // Messages
  messages: ClaudeDevMessage[];

  // Streaming state
  streamingMessageId: string | null;

  // Element picker
  isPickingElement: boolean;
  selectedElement: ElementInfo | null;

  // Screenshot
  currentScreenshot: string | null;

  // Model selection
  selectedModel: ClaudeModel;

  // Session stats
  sessionStats: SessionStats | null;

  // Conversation history
  conversations: Omit<SavedConversation, "messages">[];
  currentConversationId: string | null;

  // Actions
  fetchStatus: () => Promise<void>;
  sendMessage: (content: string, currentView: string) => Promise<void>;
  sendMessageStreaming: (content: string, currentView: string) => Promise<void>;
  captureScreenshot: (rect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => Promise<string | null>;
  clearMessages: () => Promise<void>;
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;

  // Element picker actions
  setPickingElement: (isPicking: boolean) => void;
  setSelectedElement: (element: ElementInfo | null) => void;
  clearSelectedElement: () => void;

  // Screenshot actions
  setCurrentScreenshot: (screenshot: string | null) => void;

  // Streaming handlers
  handleStreamChunk: (chunk: StreamChunk) => void;
  handleStreamEnd: (messageId: string) => void;

  // Model selection
  fetchModels: () => Promise<void>;
  setModel: (model: ClaudeModel) => Promise<void>;

  // Session stats
  fetchSessionStats: () => Promise<void>;

  // Conversation history
  fetchHistory: () => Promise<void>;
  loadConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;

  // Internal
  addMessage: (message: ClaudeDevMessage) => void;
  updateMessage: (id: string, updates: Partial<ClaudeDevMessage>) => void;
}

export const useClaudeDevStore = create<ClaudeDevState>((set, get) => ({
  // Initial state
  status: null,
  isLoading: false,
  messages: [],
  streamingMessageId: null,
  isPickingElement: false,
  selectedElement: null,
  currentScreenshot: null,
  selectedModel: "sonnet",
  sessionStats: null,
  conversations: [],
  currentConversationId: null,

  fetchStatus: async () => {
    if (!window.api?.claudeDev) return;
    const res = await window.api.claudeDev.getStatus();
    if (res.data) {
      set({ status: res.data, selectedModel: res.data.model });
    }
  },

  sendMessage: async (content: string, currentView: string) => {
    if (!window.api?.claudeDev) {
      console.error("[ClaudeDev Store] API not available");
      return;
    }

    const { currentScreenshot, selectedElement } = get();

    // Optimistically add user message
    const userMessageId = crypto.randomUUID();
    const userMessage: ClaudeDevMessage = {
      id: userMessageId,
      role: "user",
      content,
      timestamp: Date.now(),
      screenshot: currentScreenshot ?? undefined,
    };

    set((state) => ({
      isLoading: true,
      messages: [...state.messages, userMessage],
      currentScreenshot: null,
      selectedElement: null,
      isPickingElement: false,
    }));

    try {
      const res = await window.api.claudeDev.sendMessage(content, {
        screenshot: currentScreenshot ?? undefined,
        elementInfo: selectedElement ?? undefined,
        currentView,
      });

      if (res.error) {
        console.error("[ClaudeDev Store] Send error:", res.error);
        const errorMessage: ClaudeDevMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Error: ${res.error}`,
          timestamp: Date.now(),
        };
        set((state) => ({
          messages: [...state.messages, errorMessage],
        }));
      }

      // Refresh stats after message
      get().fetchSessionStats();
    } catch (error) {
      console.error("[ClaudeDev Store] Exception:", error);
      const errorMessage: ClaudeDevMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now(),
      };
      set((state) => ({
        messages: [...state.messages, errorMessage],
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  sendMessageStreaming: async (content: string, currentView: string) => {
    if (!window.api?.claudeDev) {
      console.error("[ClaudeDev Store] API not available");
      return;
    }

    const { currentScreenshot, selectedElement } = get();

    // Add user message
    const userMessageId = crypto.randomUUID();
    const userMessage: ClaudeDevMessage = {
      id: userMessageId,
      role: "user",
      content,
      timestamp: Date.now(),
      screenshot: currentScreenshot ?? undefined,
    };

    set((state) => ({
      isLoading: true,
      messages: [...state.messages, userMessage],
      currentScreenshot: null,
      selectedElement: null,
      isPickingElement: false,
    }));

    try {
      // Note: The assistant message is created by the backend and sent via IPC
      const res = await window.api.claudeDev.sendMessageStreaming(content, {
        screenshot: currentScreenshot ?? undefined,
        elementInfo: selectedElement ?? undefined,
        currentView,
      });

      if (res.error) {
        console.error("[ClaudeDev Store] Streaming error:", res.error);
      }

      // Refresh stats after message
      get().fetchSessionStats();
    } catch (error) {
      console.error("[ClaudeDev Store] Streaming exception:", error);
    }
    // Note: isLoading is set to false by handleStreamEnd
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
    set({ messages: [], streamingMessageId: null });
  },

  startSession: async () => {
    if (!window.api?.claudeDev) return;
    const res = await window.api.claudeDev.startSession();
    if (res.data) {
      set({
        messages: [],
        currentConversationId: res.data,
        streamingMessageId: null,
      });
    }
  },

  endSession: async () => {
    if (!window.api?.claudeDev) return;
    await window.api.claudeDev.endSession();
    set({
      messages: [],
      currentScreenshot: null,
      selectedElement: null,
      currentConversationId: null,
      streamingMessageId: null,
    });
  },

  setPickingElement: (isPicking) => set({ isPickingElement: isPicking }),

  setSelectedElement: (element) =>
    set({
      selectedElement: element,
      isPickingElement: false,
    }),

  clearSelectedElement: () => set({ selectedElement: null }),

  setCurrentScreenshot: (screenshot) => set({ currentScreenshot: screenshot }),

  // Streaming handlers
  handleStreamChunk: (chunk: StreamChunk) => {
    set((state) => ({
      streamingMessageId: chunk.messageId,
      messages: state.messages.map((m) =>
        m.id === chunk.messageId ? { ...m, content: chunk.fullContent } : m,
      ),
    }));
  },

  handleStreamEnd: (messageId: string) => {
    set((state) => ({
      streamingMessageId: null,
      isLoading: false,
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, isStreaming: false } : m,
      ),
    }));
  },

  // Model selection
  fetchModels: async () => {
    if (!window.api?.claudeDev) return;
    const modelRes = await window.api.claudeDev.getModel();
    if (modelRes.data) {
      set({ selectedModel: modelRes.data });
    }
  },

  setModel: async (model: ClaudeModel) => {
    if (!window.api?.claudeDev) return;
    await window.api.claudeDev.setModel(model);
    set({ selectedModel: model });
  },

  // Session stats
  fetchSessionStats: async () => {
    if (!window.api?.claudeDev) return;
    const res = await window.api.claudeDev.getSessionStats();
    if (res.data) {
      set({ sessionStats: res.data });
    }
  },

  // Conversation history
  fetchHistory: async () => {
    if (!window.api?.claudeDev) return;
    const res = await window.api.claudeDev.getHistory();
    if (res.data) {
      set({ conversations: res.data });
    }
  },

  loadConversation: async (id: string) => {
    if (!window.api?.claudeDev) return;
    const res = await window.api.claudeDev.loadConversation(id);
    if (res.data) {
      set({
        messages: res.data.messages,
        currentConversationId: id,
        selectedModel: res.data.metadata.model,
      });
    }
  },

  deleteConversation: async (id: string) => {
    if (!window.api?.claudeDev) return;
    await window.api.claudeDev.deleteConversation(id);
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
    }));
  },

  addMessage: (message) => {
    set((state) => {
      // Check if message already exists (avoid duplicates from IPC)
      const exists = state.messages.some((m) => m.id === message.id);
      if (exists) {
        // Update existing message
        return {
          messages: state.messages.map((m) =>
            m.id === message.id ? { ...m, ...message } : m,
          ),
          streamingMessageId: message.isStreaming
            ? message.id
            : state.streamingMessageId,
        };
      }
      return {
        messages: [...state.messages, message],
        streamingMessageId: message.isStreaming
          ? message.id
          : state.streamingMessageId,
      };
    });
  },

  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m,
      ),
    }));
  },
}));

// Subscribe to IPC messages
if (typeof window !== "undefined" && window.api?.claudeDev) {
  // Message updates (new or full messages)
  window.api.claudeDev.onMessage?.((message) => {
    useClaudeDevStore.getState().addMessage(message as ClaudeDevMessage);
  });

  // Streaming chunks
  window.api.claudeDev.onChunk?.((chunk) => {
    useClaudeDevStore.getState().handleStreamChunk(chunk as StreamChunk);
  });

  // Stream end
  window.api.claudeDev.onStreamEnd?.((messageId) => {
    useClaudeDevStore.getState().handleStreamEnd(messageId);
  });
}
