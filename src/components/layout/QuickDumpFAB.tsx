import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QuickDumpFABProps {
  onClick: () => void;
}

export function QuickDumpFAB({ onClick }: QuickDumpFABProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Button
            onClick={onClick}
            size="icon"
            className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95"
            aria-label="Quick Dump (Ctrl+Shift+S)"
          >
            <Zap className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="flex items-center gap-2">
          <span>Quick Dump</span>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-black/20 rounded">
            Ctrl+⇧+S
          </kbd>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
