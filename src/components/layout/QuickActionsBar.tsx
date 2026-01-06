import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/stores/useAppStore";

interface QuickActionsBarProps {
  onOpenQuickDump: () => void;
}

export function QuickActionsBar({ onOpenQuickDump }: QuickActionsBarProps) {
  const [mounted, setMounted] = useState(false);
  const getCardsDueToday = useAppStore((state) => state.getCardsDueToday);
  const isHydrated = useAppStore((state) => state.isHydrated);
  const setCurrentView = useAppStore((state) => state.setCurrentView);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dueCount = mounted && isHydrated ? getCardsDueToday().length : 0;

  return (
    <div className="border-b border-black/10 bg-background shadow-sm">
      <div className="mx-auto max-w-7xl px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Button
              variant="default"
              size="lg"
              className="min-h-[52px] px-8 font-serif font-bold text-lg shadow-lg hover:shadow-primary/10 transition-all rounded-xl"
              onClick={onOpenQuickDump}
            >
              Quick Dump
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="min-h-[52px] px-8 gap-3 border-white/5 bg-white/5 hover:bg-white/10 font-serif font-semibold text-lg transition-all rounded-xl"
              onClick={() => setCurrentView("review")}
            >
              <span className="opacity-80">Queue</span>
              <Badge
                variant="secondary"
                className="px-4 py-1.5 bg-primary text-primary-foreground border-none font-black text-sm rounded-lg shadow-sm"
              >
                {dueCount}
              </Badge>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-14 w-14 hover:bg-white/5 transition-all rounded-2xl"
            onClick={() => setCurrentView("settings")}
          >
            <Settings className="h-7 w-7 text-muted-foreground/60" />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
