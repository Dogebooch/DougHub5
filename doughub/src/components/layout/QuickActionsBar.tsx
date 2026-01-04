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
    <div className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="default"
              size="lg"
              className="min-h-[44px]"
              onClick={onOpenQuickDump}
            >
              Quick Dump
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="min-h-[44px] gap-2"
              onClick={() => setCurrentView("review")}
            >
              <span>Due Today:</span>
              <Badge variant="outline" className="ml-1 bg-background">
                {dueCount}
              </Badge>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="min-h-[44px] min-w-[44px]"
            onClick={() => setCurrentView("settings")}
          >
            <Settings className="h-5 w-5" />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
