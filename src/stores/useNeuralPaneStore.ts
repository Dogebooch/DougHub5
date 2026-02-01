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
- Medical Archetypes (v26): A specialized database for 8 core medical categories (Diseases, Drugs, Pathogens, Presentations, Labs/Imaging, Procedures, Anatomy, and Algorithms).
- Intelligent Learning (FSRS): Uses the "Free Spaced Repetition Scheduler" to calculate the best time to review cards based on how hard they were and how fast you answered.
- AI Suite: Local (Ollama) and Cloud (Claude/OpenAI) AI for extracting facts, generating quizzes, and analyzing medical concepts.
- Topic Engine: Automatically manages medical topics, aliases, and merges to prevent duplicate entries.
- Robust Backup: Creates snapshots of your knowledge base on startup, shutdown, and every 15 minutes to prevent data loss.`,
      todos: `- [ ] Implement UI for Knowledge Archetypes (v26)
- [ ] Refine AI extraction for complex medical vignettes
- [ ] Optimize database queries for large card libraries
- [ ] Finalize "Systems & Satellites" orbital navigation`,
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
