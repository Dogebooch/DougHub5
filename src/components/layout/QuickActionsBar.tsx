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
    <div className="border-b border-black/30 bg-black/40 backdrop-blur-xl shadow-lg relative z-20">
      <div className="mx-auto max-w-7xl px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button
              variant="default"
              size="xl"
              className="px-10 font-sans font-black uppercase tracking-widest shadow-[0_15px_30px_-10px_rgba(63,150,143,0.5)] hover:shadow-primary/40 hover:translate-y-[-2px] transition-all rounded-[1.25rem] h-16"
              onClick={onOpenQuickDump}
            >
              Quick Dump
            </Button>
            <Button
              variant="outline"
              size="xl"
              className="px-8 gap-5 border-black/20 bg-black/20 hover:bg-black/40 font-sans font-bold uppercase tracking-widest transition-all rounded-[1.25rem] h-16 group"
              onClick={() => setCurrentView("review")}
            >
              <span className="opacity-40 group-hover:opacity-100 transition-opacity">Queue</span>
              <Badge
                variant="secondary"
                className="px-5 py-2 bg-primary text-primary-foreground border-none font-black text-sm rounded-xl shadow-inner scale-110"
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
