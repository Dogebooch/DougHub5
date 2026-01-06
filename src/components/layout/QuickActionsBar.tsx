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
    <div className="border-b border-white/5 bg-background shadow-sm">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="default"
              size="lg"
              className="min-h-[48px] px-6 font-bold shadow-md hover:shadow-primary/20 transition-all"
              onClick={onOpenQuickDump}
            >
              Quick Dump
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="min-h-[48px] px-6 gap-2 border-white/10 hover:bg-white/5 font-semibold"
              onClick={() => setCurrentView("review")}
            >
              <span>Due Today</span>
              <Badge
                variant="secondary"
                className="ml-1 px-3 py-1 bg-primary text-white border-none font-bold"
              >
                {dueCount}
              </Badge>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 hover:bg-white/5 transition-colors"
            onClick={() => setCurrentView("settings")}
          >
            <Settings className="h-6 w-6 text-muted-foreground" />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
