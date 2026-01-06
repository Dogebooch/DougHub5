/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom";
import { ReviewInterface } from "../ReviewInterface";
import { useAppStore } from "@/stores/useAppStore";
import { Rating } from "@/types";

// Mock the store
vi.mock("@/stores/useAppStore", () => ({
  useAppStore: vi.fn(),
}));

// Mock the toast hook
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock window.api
const mockApi = {
  cards: {
    getAll: vi.fn(),
  },
  notes: {
    getAll: vi.fn(),
  },
  db: {
    status: vi.fn(),
  },
};

global.window.api = mockApi as any;

const mockCards = [
  {
    id: "card-1",
    front: "Front of card 1",
    back: "Back of card 1",
    noteId: "note-1",
    dueDate: new Date(Date.now() - 10000).toISOString(), // Overdue
    cardType: "standard",
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: 0,
    lastReview: null,
  },
  {
    id: "card-2",
    front: "Front of card 2",
    back: "Back of card 2",
    noteId: "note-2",
    dueDate: new Date(Date.now() - 10000).toISOString(), // Overdue
    cardType: "standard",
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: 0,
    lastReview: null,
  },
];

const mockNotes = [
  { id: "note-1", title: "Note 1", content: "Content 1", cardIds: ["card-1"] },
  { id: "note-2", title: "Note 2", content: "Content 2", cardIds: ["card-2"] },
];

describe("ReviewInterface", () => {
  const scheduleCardReview = vi.fn().mockResolvedValue({ success: true, data: {} });
  const setCurrentView = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    (useAppStore as any).mockReturnValue({
      cards: mockCards,
      notes: mockNotes,
      isHydrated: true,
      setCurrentView,
      scheduleCardReview,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Zero-Decision Flow (Default)", () => {
    it("initially shows only 'Show Answer' and pressing Space reveals answer", async () => {
      render(<ReviewInterface />);
      
      expect(screen.getByText("Show Answer")).toBeInTheDocument();
      expect(screen.queryByText("Continue")).not.toBeInTheDocument();
      expect(screen.queryByText("Easy")).not.toBeInTheDocument();

      fireEvent.keyDown(window, { key: " " });
      
      expect(screen.getByText("Continue")).toBeInTheDocument();
      expect(screen.getByText("Back of card 1")).toBeInTheDocument();
      // Manual grading buttons should NOT be visible in default flow unless paused/timed-out
      expect(screen.queryByText("Easy")).not.toBeInTheDocument();
    });

    it("pressing Space again or clicking Continue triggers auto-rating", async () => {
      render(<ReviewInterface />);
      
      // Show answer
      fireEvent.keyDown(window, { key: " " });
      
      // Advance time by 2s (Easy rating because < 5s)
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Press Space to continue
      fireEvent.keyDown(window, { key: " " });

      // Should show feedback for 1s. Rating.Easy label is "Mastered"
      expect(screen.getByText(/Mastered/i)).toBeInTheDocument();
      
      // Complete feedback period
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(scheduleCardReview).toHaveBeenCalledWith("card-1", Rating.Easy, 2000);
    });
  });

  describe("Auto-Rating & Timing Logic", () => {
    const testAutoRating = async (timeMs: number, expectedRating: number) => {
      render(<ReviewInterface />);
      
      // Show answer
      fireEvent.keyDown(window, { key: " " });
      
      act(() => {
        vi.advanceTimersByTime(timeMs);
      });

      fireEvent.keyDown(window, { key: " " });

      // Advance 1s for the feedback delay
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(scheduleCardReview).toHaveBeenCalledWith("card-1", expectedRating, timeMs);
      vi.clearAllMocks();
    };


    it("assigns Easy (4) for response < 5s", async () => {
      await testAutoRating(4000, Rating.Easy);
    });

    it("assigns Good (3) for response 5-15s", async () => {
      await testAutoRating(10000, Rating.Good);
    });

    it("assigns Hard (2) for response 15-30s", async () => {
      await testAutoRating(20000, Rating.Hard);
    });

    it("assigns Again (1) for response > 30s", async () => {
      await testAutoRating(35000, Rating.Again);
    });
  });

  describe("Feedback Loop", () => {
    it("shows feedback for 1s and ignores keyboard input during that time", async () => {
      render(<ReviewInterface />);
      
      fireEvent.keyDown(window, { key: " " }); // Show answer
      act(() => { vi.advanceTimersByTime(2000); });
      fireEvent.keyDown(window, { key: " " }); // Continue

      // Feedback should be visible. Rating.Easy label is "Mastered"
      expect(screen.getByText(/Mastered/i)).toBeInTheDocument();

      // Try to press Space again during feedback (should be ignored)
      fireEvent.keyDown(window, { key: " " });
      
      act(() => { vi.advanceTimersByTime(500); });
      expect(scheduleCardReview).not.toHaveBeenCalled(); // Still in timeout

      await act(async () => {
        vi.advanceTimersByTime(500);
      });
      expect(scheduleCardReview).toHaveBeenCalled();
    });
  });


  describe("Manual Overrides & Keyboard", () => {
    it("allows manual override using 1-4 keys", async () => {
      render(<ReviewInterface />);
      
      fireEvent.keyDown(window, { key: " " }); // Show answer
      
      // Press '2' for Hard
      fireEvent.keyDown(window, { key: "2" });
      
      act(() => { vi.advanceTimersByTime(1000); });
      
      expect(scheduleCardReview).toHaveBeenCalledWith("card-1", Rating.Hard, null);
    });

    it("exits to capture view on Escape", () => {
      render(<ReviewInterface />);
      fireEvent.keyDown(window, { key: "Escape" });
      expect(setCurrentView).toHaveBeenCalledWith("capture");
    });
  });

  describe("Session Edge Cases", () => {
    it("pauses and requires manual grading after 60s timeout", async () => {
      render(<ReviewInterface />);
      
      fireEvent.keyDown(window, { key: " " }); // Show answer
      
      act(() => {
        vi.advanceTimersByTime(61000);
      });

      // Continue should be hidden after timeout
      expect(screen.queryByText("Continue")).not.toBeInTheDocument();
      expect(screen.getByText(/Stepped away/i)).toBeInTheDocument();

      // Pressing Space should now show manual grading buttons
      fireEvent.keyDown(window, { key: " " });

      expect(screen.getByText("Forgot")).toBeInTheDocument();
      expect(screen.getByText("Struggled")).toBeInTheDocument();
      expect(screen.getByText("Recalled")).toBeInTheDocument();
      expect(screen.getByText("Mastered")).toBeInTheDocument();
    });

    it("re-queues the card when rated Again (1)", async () => {
      // For this test we need to let the component manage the queue
      render(<ReviewInterface />);
      
      fireEvent.keyDown(window, { key: " " }); // Show answer for card 1
      fireEvent.keyDown(window, { key: "1" }); // Rate Again (Forgot)
      
      await act(async () => { vi.advanceTimersByTime(1100); });

      // Card 2 should now be shown
      expect(screen.getByText("Front of card 2")).toBeInTheDocument();

      // Review card 2
      fireEvent.keyDown(window, { key: " " }); // Show answer for card 2
      fireEvent.keyDown(window, { key: "4" }); // Rate Easy (Mastered)
      await act(async () => { vi.advanceTimersByTime(1100); });

      // Now card 1 should be back
      expect(screen.getByText("Front of card 1")).toBeInTheDocument();
    });

    it("shows session complete state when queue is empty", async () => {
      // Mock with just one card
      (useAppStore as any).mockReturnValue({
        cards: [mockCards[0]],
        notes: [mockNotes[0]],
        isHydrated: true,
        setCurrentView,
        scheduleCardReview,
      });

      render(<ReviewInterface />);
      
      fireEvent.keyDown(window, { key: " " }); // Show answer
      fireEvent.keyDown(window, { key: "4" }); // Rate Easy (Mastered)
      
      await act(async () => { vi.advanceTimersByTime(1100); });

      expect(screen.getByText(/Session complete/i)).toBeInTheDocument();
      
      await act(async () => { vi.advanceTimersByTime(2100); });
      expect(setCurrentView).toHaveBeenCalledWith("capture");
    });
  });

});

