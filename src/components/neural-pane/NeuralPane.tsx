import { useRef, useEffect } from "react";
import { useNeuralPaneStore } from "@/stores/useNeuralPaneStore";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Terminal,
  ClipboardList,
  User,
} from "lucide-react";

export function NeuralPane() {
  const {
    isOpen,
    toggle,
    backendLogic,
    todos,
    userNotes,
    setUserNotes,
    activePhase,
  } = useNeuralPaneStore();

  const userNotesRef = useRef<HTMLTextAreaElement>(null);
  const backendLogicRef = useRef<HTMLTextAreaElement>(null);
  const todosRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textareas
  useEffect(() => {
    [userNotesRef, backendLogicRef, todosRef].forEach((ref) => {
      if (ref.current) {
        ref.current.style.height = "auto";
        ref.current.style.height = ref.current.scrollHeight + "px";
      }
    });
  }, [backendLogic, todos, userNotes]);

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
          <BookOpen className="w-4 h-4 mb-2 rotate-90" />
          DEVELOPER NOTEPAD
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-[450px] bg-slate-950 border-l border-slate-800 flex flex-col shrink-0 shadow-2xl transition-all duration-300 relative font-sans text-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center shrink-0">
        <h2 className="text-teal-400 font-mono text-sm font-bold flex items-center gap-2">
          <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
          DEVELOPER NOTEPAD
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
            {activePhase}
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
        <div className="p-6 space-y-8">
          {/* Section 1: Backend Logic */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-teal-400 text-[10px] uppercase font-bold tracking-widest border-b border-teal-500/20 pb-2">
              <Terminal className="w-3.5 h-3.5" />
              Backend Logic
            </div>
            <Textarea
              ref={backendLogicRef}
              value={backendLogic}
              readOnly
              className="w-full bg-slate-900/40 border-slate-800/50 text-slate-300 font-mono text-xs leading-relaxed resize-none focus-visible:ring-0 focus-visible:ring-offset-0 border-none p-0 min-h-[50px]"
            />
          </div>

          {/* Section 2: ToDo's */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-blue-400 text-[10px] uppercase font-bold tracking-widest border-b border-blue-500/20 pb-2">
              <ClipboardList className="w-3.5 h-3.5" />
              ToDo's
            </div>
            <Textarea
              ref={todosRef}
              value={todos}
              readOnly
              className="w-full bg-slate-900/40 border-slate-800/50 text-slate-300 font-mono text-xs leading-relaxed resize-none focus-visible:ring-0 focus-visible:ring-offset-0 border-none p-0 min-h-[50px]"
            />
          </div>

          {/* Section 3: User Notes */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-purple-400 text-[10px] uppercase font-bold tracking-widest border-b border-purple-500/20 pb-2">
              <User className="w-3.5 h-3.5" />
              User Notes
            </div>
            <Textarea
              ref={userNotesRef}
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="// Type your personal notes here..."
              className="w-full bg-slate-900/60 border-slate-800 text-slate-200 font-mono text-sm leading-relaxed focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 resize-none min-h-[200px] p-3 rounded-md"
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
