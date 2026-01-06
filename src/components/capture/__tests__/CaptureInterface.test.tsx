/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { CaptureInterface } from '../CaptureInterface';
import { useAppStore } from '@/stores/useAppStore';

// Mock sonner toast
const { mockToast } = vi.hoisted(() => {
  const t = vi.fn() as any;
  t.error = vi.fn();
  t.info = vi.fn();
  t.success = vi.fn();
  t.warning = vi.fn();
  return { mockToast: t };
});

vi.mock('sonner', () => ({
  toast: mockToast,
}));

// Mock useAppStore
const mockAddNote = vi.fn();
const mockAddCard = vi.fn();

vi.mock('@/stores/useAppStore', () => ({
  useAppStore: vi.fn(),
}));

// Mock window.api
const mockExtractConcepts = vi.fn();
const mockValidateCard = vi.fn();

(window as any).api = {
  ai: {
    extractConcepts: mockExtractConcepts,
    validateCard: mockValidateCard,
  },
};

// Mock crypto.randomUUID
if (!global.crypto) {
    (global as any).crypto = {} as any;
}
(global.crypto as any).randomUUID = vi.fn(() => 'test-uuid-9999');

const DRAFT_STORAGE_KEY = "doughub-capture-draft";

describe('CaptureInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup store mock
    (useAppStore as any).mockImplementation(() => ({
      addNote: mockAddNote,
      addCard: mockAddCard,
    }));

    // Mock localStorage
    const store: Record<string, string> = {};
    const localStorageMock = {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value.toString();
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        for (const key in store) delete store[key];
      }),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

    // Default API returns
    mockExtractConcepts.mockResolvedValue({ 
      data: { 
        concepts: [], 
        listDetection: { isList: false, listType: null, items: [] } 
      }, 
      error: null 
    });
    mockValidateCard.mockResolvedValue({ data: { isValid: true, suggestions: [] }, error: null });
    
    mockAddNote.mockResolvedValue({ success: true });
    mockAddCard.mockResolvedValue({ success: true });
    
    // Mock Date.now() for predictable relative time
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-01-05T12:00:00Z').getTime());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Draft Recovery', () => {
    it('restores content from localStorage on mount', async () => {
      const savedTime = Date.now() - 1000 * 60 * 5; // 5 minutes ago
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
        content: "Saved draft content",
        timestamp: savedTime
      }));

      render(<CaptureInterface />);

      const textarea = screen.getByPlaceholderText(/Paste medical notes/i) as HTMLTextAreaElement;
      expect(textarea.value).toBe("Saved draft content");
      expect(mockToast).toHaveBeenCalledWith("Previous session restored", expect.any(Object));
    });
  });

  describe('Concept Extraction & UI Flow', () => {
    it('extracts concepts and shows them as checkboxes', async () => {
      render(<CaptureInterface />);

      const textarea = screen.getByPlaceholderText(/Paste medical notes/i);
      fireEvent.change(textarea, { target: { value: "Acute Pulmonary Embolism" } });

      const extractButton = screen.getByRole('button', { name: /Extract Concepts/i });
      
      const mockConcepts = [
        { id: '1', text: 'Symptoms', conceptType: 'Clinical Feature', suggestedFormat: 'cloze' },
        { id: '2', text: 'Diagnosis', conceptType: 'Diagnostic Test', suggestedFormat: 'cloze' },
        { id: '3', text: 'Treatment', conceptType: 'Management', suggestedFormat: 'cloze' },
      ];

      mockExtractConcepts.mockResolvedValueOnce({
        data: {
          concepts: mockConcepts,
          listDetection: { isList: false, listType: null, items: [] }
        },
        error: null
      });

      fireEvent.click(extractButton);

      await waitFor(() => {
        expect(screen.getByText(/Symptoms/)).toBeDefined();
        expect(screen.getByText(/Diagnosis/)).toBeDefined();
        expect(screen.getByText(/Treatment/)).toBeDefined();
      });

      // Verify checkboxes are auto-selected
      mockConcepts.forEach(concept => {
        const checkbox = screen.getByLabelText(new RegExp(`Select concept: ${concept.text}`, 'i'));
        expect(checkbox.getAttribute('aria-checked')).toBe('true');
      });

      // Verify validation was called for each concept
      expect(mockValidateCard).toHaveBeenCalledTimes(3);
    });
  });

  describe('Batch Saving', () => {
    it('saves note and cards on click', async () => {
      render(<CaptureInterface />);

      // Pre-populate with extracted concepts
      const mockConcepts = [
        { id: '1', text: 'Symptoms', conceptType: 'Clinical Feature', suggestedFormat: 'cloze' },
        { id: '2', text: 'Diagnosis', conceptType: 'Diagnostic Test', suggestedFormat: 'cloze' },
      ];

      const textarea = screen.getByPlaceholderText(/Paste medical notes/i);
      fireEvent.change(textarea, { target: { value: "Acute PE" } });

      mockExtractConcepts.mockResolvedValueOnce({
        data: {
          concepts: mockConcepts,
          listDetection: { isList: false, listType: null, items: [] }
        },
        error: null
      });

      fireEvent.click(screen.getByRole('button', { name: /Extract Concepts/i }));

      await waitFor(() => {
        expect(screen.getByText(/Symptoms/)).toBeDefined();
      });

      const createButton = screen.getByRole('button', { name: /Create 2 Cards/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockAddNote).toHaveBeenCalledTimes(1);
        expect(mockAddCard).toHaveBeenCalledTimes(2);
        expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining("Saved 2 cards!"), expect.any(Object));
      });

      // Verify state reset
      expect((screen.getByPlaceholderText(/Paste medical notes/i) as HTMLTextAreaElement).value).toBe("");
      expect(screen.queryByText(/Symptoms/)).toBeNull();
    });
  });

  describe('Error Resilience', () => {
    it('shows error toast when extraction fails', async () => {
      render(<CaptureInterface />);

      const textarea = screen.getByPlaceholderText(/Paste medical notes/i);
      fireEvent.change(textarea, { target: { value: "Something" } });

      mockExtractConcepts.mockResolvedValueOnce({
        data: null,
        error: "AI provider offline"
      });

      fireEvent.click(screen.getByRole('button', { name: /Extract Concepts/i }));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Failed to extract concepts", expect.objectContaining({
          description: "AI provider offline"
        }));
      });
    });

    it('shows warning when no concepts are extracted', async () => {
      render(<CaptureInterface />);

      const textarea = screen.getByPlaceholderText(/Paste medical notes/i);
      fireEvent.change(textarea, { target: { value: "Random text" } });

      mockExtractConcepts.mockResolvedValueOnce({
        data: { concepts: [], listDetection: { isList: false, listType: null, items: [] } },
        error: null
      });

      fireEvent.click(screen.getByRole('button', { name: /Extract Concepts/i }));

      await waitFor(() => {
        expect(mockToast.warning).toHaveBeenCalledWith("No concepts extracted", expect.any(Object));
      });
    });
  });

  describe('Keyboard Accessibility', () => {
    it('triggers extraction on Ctrl+Enter in textarea', async () => {
      render(<CaptureInterface />);

      const textarea = screen.getByPlaceholderText(/Paste medical notes/i);
      fireEvent.change(textarea, { target: { value: "PE" } });

      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

      await waitFor(() => {
        expect(mockExtractConcepts).toHaveBeenCalled();
      });
    });

    it('clears results on Escape key', async () => {
      render(<CaptureInterface />);

      // Setup state with concepts
      const mockConcepts = [{ id: '1', text: 'Symptoms', conceptType: 'X', suggestedFormat: 'cloze' }];
      mockExtractConcepts.mockResolvedValueOnce({
          data: { concepts: mockConcepts, listDetection: { isList: false, listType: null, items: [] } },
          error: null
      });

      fireEvent.change(screen.getByPlaceholderText(/Paste medical notes/i), { target: { value: "test" } });
      fireEvent.click(screen.getByRole('button', { name: /Extract Concepts/i }));

      await waitFor(() => {
        expect(screen.getByText(/Symptoms/)).toBeDefined();
      });

      fireEvent.keyDown(window, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText(/Symptoms/)).toBeNull();
      });
    });
  });
});
