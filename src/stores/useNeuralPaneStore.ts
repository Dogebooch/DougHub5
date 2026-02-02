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
- Practice Bank (v28): "Anti-Anki-Hell" tiered flashcard system. Cards generated at Forging with Golden Ticket active by default, rest suspended. Simulator unlocks at 60-day maturity. Failure Attribution Checklists activate specific Practice Bank cards.
- FSRS Scheduling: Uses the "Free Spaced Repetition Scheduler" to calculate the best time to review cards based on how hard they were and how fast you answered.
- Learning Dashboard (v5.0): A central hub for Daily Reviews, Mastery Insights, AI Classroom, and Active Recall pipelines.
- AI Suite: Local (Ollama) and Cloud (Claude/OpenAI) AI for extracting facts, generating quizzes, and analyzing medical concepts.
- Topic Engine: Automatically manages medical topics, aliases, and merges to prevent duplicate entries.
- Golden Ticket: Forces user to manually type key discriminator for each entity to activate Generation Effect. Generates 1 active + 4-5 banked cards per entity.
- Robust Backup: Creates snapshots of your knowledge base on startup, shutdown, and every 15 minutes to prevent data loss.`,
      todos: `IMPLEMENT NOW:
- [x] v28 Migration: Practice Bank flashcards table
- [x] Practice Bank query module (CRUD, activation, resurrection)
- [ ] FlashcardTemplateEngine class (generate cards from entity)
- [ ] Hook card generation into ArchetypeExtractionDialog
- [ ] Practice Bank card list in Entity Viewer

DEFER (HIGH PRIORITY):
- [ ] Simulator engine (vignette generation, Ghost Distractors)
- [ ] Failure Attribution UI (checkboxes after failure)
- [ ] RCS color highlighting in Notebook articles
- [ ] Duplicate entity detection/merging

DEFER (POLISH):
- [ ] Practice Bank Global Browser
- [ ] Compare & Contrast card auto-generator
- [ ] Deep Dive mode (unlimited practice bypass)
- [ ] Version History / Undo for entity edits`,
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
