import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NeuralPaneState {
  isOpen: boolean;
  activePhase: string;
  notes: string;
  anxietyAntidote: string;
  sortingLogic: string;
  cognitiveScience: string;

  toggle: () => void;
  setOpen: (isOpen: boolean) => void;
  setNotes: (notes: string) => void;
  setPhase: (phase: string) => void;
  setAnxietyAntidote: (text: string) => void;
  setSortingLogic: (text: string) => void;
  setCognitiveScience: (text: string) => void;
}

export const useNeuralPaneStore = create<NeuralPaneState>()(
  persist(
    (set) => ({
      isOpen: true,
      activePhase: "IDLE",
      notes: "",
      anxietyAntidote: "Waiting for neural link...",
      sortingLogic: "System standby.",
      cognitiveScience: "Cognitive load minimal.",

      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
      setOpen: (isOpen) => set({ isOpen }),
      setNotes: (notes) => set({ notes }),
      setPhase: (activePhase) => set({ activePhase }),
      setAnxietyAntidote: (anxietyAntidote) => set({ anxietyAntidote }),
      setSortingLogic: (sortingLogic) => set({ sortingLogic }),
      setCognitiveScience: (cognitiveScience) => set({ cognitiveScience }),
    }),
    {
      name: "neural-pane-storage",
    },
  ),
);
