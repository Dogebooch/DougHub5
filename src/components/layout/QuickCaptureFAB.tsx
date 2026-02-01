import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface QuickCaptureFABProps {
  onClick: () => void;
}

export function QuickCaptureFAB({ onClick }: QuickCaptureFABProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Button
            onClick={onClick}
            className={cn(
              "fixed bottom-6 z-50 h-11 px-5 rounded-full shadow-lg bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all duration-200 hover:scale-105 hover:shadow-xl active:scale-95 flex items-center gap-2",
              "right-6",
            )}
            aria-label="Quick Capture (Ctrl+Shift+S)"
          >
            <Plus className="h-5 w-5" />
            <span className="font-medium">Capture</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="flex items-center gap-2">
          <span className="text-muted-foreground/60">Quick Capture</span>
          <kbd className="px-1 py-0.5 bg-muted/50 rounded text-[11px]">
            Ctrl+⇧+S
          </kbd>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
