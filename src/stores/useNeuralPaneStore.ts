import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NeuralPaneState {
  isOpen: boolean;
  activePhase: string;
  backendLogic: string;
  todos: string;
  userNotes: string;

  toggle: () => void;
  setOpen: (isOpen: boolean) => void;
  setBackendLogic: (text: string) => void;
  setTodos: (text: string) => void;
  setUserNotes: (text: string) => void;
  setPhase: (phase: string) => void;
}

export const useNeuralPaneStore = create<NeuralPaneState>()(
  persist(
    (set) => ({
      isOpen: true,
      activePhase: "IDLE",
      backendLogic: `DOUGHUB CORE LOGIC:
- Smart Capture: Automatically pulls medical questions from web browsers, downloads relevant images, and checks for duplicates using unique Question IDs.
- Medical Archetypes (v26/v27): A specialized database for 9 core medical categories (Diseases, Drugs, Pathogens, Presentations, Labs/Imaging, Imaging Findings, Procedures, Anatomy, and Algorithms). Includes AI suggestion storage for one-click extraction.
- Intelligent Learning (FSRS): Uses the "Free Spaced Repetition Scheduler" to calculate the best time to review cards based on how hard they were and how fast you answered.
- Learning Dashboard (v5.0): A central hub for Daily Reviews, Mastery Insights, AI Classroom, and Active Recall pipelines.
- AI Suite: Local (Ollama) and Cloud (Claude/OpenAI) AI for extracting facts, generating quizzes, and analyzing medical concepts.
- Topic Engine: Automatically manages medical topics, aliases, and merges to prevent duplicate entries.
- Golden Ticket: Forces user to manually type key discriminator for each entity to activate Generation Effect.
- Robust Backup: Creates snapshots of your knowledge base on startup, shutdown, and every 15 minutes to prevent data loss.`,
      todos: `IMPLEMENT NOW:
- [/] ArchetypeExtractionDialog (dynamic form, Golden Ticket enforcement)
- [ ] One-Click Extract chips in SourceItemViewerDialog
- [ ] Keyboard shortcuts (E, Ctrl+Enter, Ctrl+Shift+Enter)
- [ ] Save-as-Draft without Golden Ticket

DEFER (POLISH):
- [ ] Batch extraction "Extract All" stepper
- [ ] Archetype-specific visual themes (icons, colors)
- [ ] Live preview card in extraction dialog
- [ ] Copy-to-clipboard for Golden Ticket
- [ ] Confidence-based chip styling for AI suggestions
- [ ] AI suggestion correction feedback loop`,
      userNotes: "",

      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
      setOpen: (isOpen) => set({ isOpen }),
      setBackendLogic: (backendLogic) => set({ backendLogic }),
      setTodos: (todos) => set({ todos }),
      setUserNotes: (userNotes) => set({ userNotes }),
      setPhase: (activePhase) => set({ activePhase }),
    }),
    {
      name: "neural-pane-storage",
    },
  ),
);
