import { useRef, useEffect } from "react";
import { useNeuralPaneStore } from "@/stores/useNeuralPaneStore";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft,
  ChevronRight,
  BrainCircuit,
  Activity,
  ArrowRightLeft,
  Zap,
} from "lucide-react";

export function NeuralPane() {
  const {
    isOpen,
    toggle,
    notes,
    setNotes,
    activePhase,
    anxietyAntidote,
    sortingLogic,
    cognitiveScience,
  } = useNeuralPaneStore();

  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize notes textarea
  useEffect(() => {
    if (notesRef.current) {
      notesRef.current.style.height = "auto";
      notesRef.current.style.height = notesRef.current.scrollHeight + "px";
    }
  }, [notes]);

  if (!isOpen) {
    return (
      <div className="h-full border-l border-slate-800 bg-slate-950 w-12 flex flex-col items-center py-4 shrink-0 transition-all duration-300">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="text-teal-500 hover:text-teal-400 hover:bg-slate-900"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div
          className="mt-8 [writing-mode:vertical-rl] rotate-180 text-xs font-mono font-bold text-slate-500 tracking-widest flex items-center gap-2 cursor-pointer"
          onClick={toggle}
        >
          <BrainCircuit className="w-4 h-4 mb-2 rotate-90" />
          NEURAL DEBUGGER
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-[450px] bg-slate-950 border-l border-slate-800 flex flex-col shrink-0 shadow-2xl transition-all duration-300 relative font-sans">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center shrink-0">
        <h2 className="text-teal-400 font-mono text-sm font-bold flex items-center gap-2">
          <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
          NEURAL DEBUGGER
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
            Cognitive State Monitor
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="h-6 w-6 text-slate-500 hover:text-slate-300"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6 font-mono">
          {/* Phase Indicator */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="text-slate-500 text-[10px] uppercase tracking-widest mb-1">
                CURRENT PROTOCOL
              </div>
              <div className="text-xl font-bold text-white">{activePhase}</div>
            </div>
            <div className="text-right">
              <div className="text-slate-500 text-[10px] uppercase tracking-widest mb-1">
                STATUS
              </div>
              <div className="text-teal-400 text-xs font-bold">ACTIVE</div>
            </div>
          </div>

          {/* Cognitive Nodes */}
          <div className="space-y-4">
            {/* Anxiety Antidote */}
            <div className="bg-blue-950/30 border-l-4 border-blue-500 p-4 rounded-r-lg">
              <div className="text-blue-400 text-[10px] uppercase tracking-widest mb-2 font-bold flex items-center gap-2">
                <Activity className="w-3 h-3" />
                ANXIETY ANTIDOTE
              </div>
              <div className="text-slate-300 italic text-sm leading-relaxed">
                "{anxietyAntidote}"
              </div>
            </div>

            {/* Sorting Logic */}
            <div className="bg-teal-950/30 border-l-4 border-teal-500 p-4 rounded-r-lg">
              <div className="text-teal-400 text-[10px] uppercase tracking-widest mb-2 font-bold flex items-center gap-2">
                <ArrowRightLeft className="w-3 h-3" />
                INTERNAL SORTING
              </div>
              <div className="text-slate-300 text-sm leading-relaxed">
                {sortingLogic}
              </div>
            </div>

            {/* Cognitive Mechanism */}
            <div className="pt-4 border-t border-slate-800">
              <div className="text-purple-400 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                <Zap className="w-3 h-3" />
                COGNITIVE MECHANISM
              </div>
              <div className="text-slate-400 text-xs leading-relaxed">
                {cognitiveScience}
              </div>
            </div>
          </div>

          {/* Quick Notes / Scratchpad */}
          <div className="pt-6 border-t border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                NEURAL SCRATCHPAD
              </span>
              <span className="text-[10px] text-slate-600">Auto-saved</span>
            </div>
            <Textarea
              ref={notesRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="// Type thoughts, backend triggers, or fluff here..."
              className="w-full min-h-[150px] bg-slate-900/50 border-slate-800 text-slate-300 font-mono text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none overflow-hidden"
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
