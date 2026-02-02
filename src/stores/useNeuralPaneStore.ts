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
      todos: `PHASE 3-4 COMPLETE:
- [x] v28 Migration: Practice Bank flashcards table
- [x] Practice Bank query module (CRUD, activation, resurrection)
- [x] FlashcardTemplateEngine class (generate cards from entity)
- [x] Hook card generation into ArchetypeExtractionDialog
- [x] Practice Bank card list component (PracticeBankCardList)
- [x] Failure Attribution UI (FailureAttributionDialog)
- [x] Simulator card component (SimulatorCard)
- [x] Preload API bindings for practiceBank/simulator

INTEGRATION NEEDED:
- [ ] Embed PracticeBankCardList in entity detail view
- [ ] Add Simulator entry point to Learn Dashboard
- [ ] Wire FailureAttributionDialog into review flow

DEFER (v1.1):
- [ ] Vignette AI generation (GPT-4 prompts)
- [ ] Ghost Distractors for Simulator
- [ ] RCS color highlighting in Notebook
- [ ] Duplicate entity detection/merging
- [ ] Practice Bank Global Browser
- [ ] Compare & Contrast card auto-generator`,
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
