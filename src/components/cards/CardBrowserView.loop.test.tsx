// @vitest-environment jsdom
import { render, waitFor } from '@testing-library/react';
import { CardBrowserView } from './CardBrowserView';
import { useAppStore } from '@/stores/useAppStore';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

// Mock react-virtualized-auto-sizer
vi.mock('react-virtualized-auto-sizer', () => ({
  default: ({ children }: any) => children({ height: 600, width: 800 }),
  AutoSizer: ({ children }: any) => children({ height: 600, width: 800 }),
}));

// Mock localStorage
const localStorageMock = (function() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });


// Mock window.api
const mockGetBrowserList = vi.fn();

const mockApi = {
  cards: {
    getBrowserList: mockGetBrowserList,
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    update: vi.fn(),
    remove: vi.fn(),
    create: vi.fn(),
    getBySiblings: vi.fn(),
  },
  app: {
    getUserDataPath: vi.fn().mockResolvedValue({ data: "path" }),
  },
  notes: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  db: {
    status: vi.fn().mockResolvedValue({ data: {} }),
  },
  settings: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    set: vi.fn(),
  },
  sourceItems: {
    onNew: vi.fn(() => () => {}),
    delete: vi.fn(),
    purgeRawPages: vi.fn(),
  },
  reviews: {
      schedule: vi.fn()
  },
  notebookPages: {
      delete: vi.fn()
  }
};

beforeEach(() => {
  vi.clearAllMocks();
  (window as any).api = mockApi;
  
  // Initialize store with minimal state
  useAppStore.setState({
      cards: [],
      notes: [],
      isHydrated: true,
      isLoading: false,
      currentView: 'cards',
      settings: {
          aiProvider: "openai",
          openaiApiKey: "",
          anthropicApiKey: "",
          ollamaModel: "llama3",
          openaiModel: "gpt-4o",
          anthropicModel: "claude-3-5-sonnet-20240620",
          fsrsRequestRetention: 0.89,
      },
      getBrowserList: async (filters: any, sort: any) => {
        const result = await mockApi.cards.getBrowserList(filters, sort);
        return result.data || [];
      }
  } as any, true);
});

describe('CardBrowserView Infinite Loop', () => {
  it('should not call getBrowserList repeatedly', async () => {
    console.log("Starting test...");
    mockGetBrowserList.mockResolvedValue({ data: [] });

    render(<CardBrowserView />);

    // Wait for initial fetch
    await waitFor(() => {
      // Check if the API was called via the store action
      expect(mockGetBrowserList).toHaveBeenCalled();
    });

    console.log("Initial fetch calls:", mockGetBrowserList.mock.calls.length);

    // Wait a bit to see if it loops
    await new Promise(resolve => setTimeout(resolve, 1000));

    const callCount = mockGetBrowserList.mock.calls.length;
    console.log('Final Call count:', callCount);
    
    expect(callCount).toBeLessThan(5);
  });
});
