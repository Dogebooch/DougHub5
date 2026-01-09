import { SearchBar } from "./SearchBar";
import { useAppStore } from "@/stores/useAppStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";

interface HeaderProps {
  openQuickCapture?: () => void; // Available for future quick capture button in header
}

export function Header({ openQuickCapture: _openQuickCapture }: HeaderProps) {
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const isBrowserMode = typeof window !== "undefined" && !window.api;

  return (
    <header className="h-14 border-b border-border/30 bg-surface-base/50 backdrop-blur-xl sticky top-0 z-50">
      <div className="h-full px-4 flex items-center justify-between gap-4">
        {/* Logo and title */}
        <button
          onClick={() => setCurrentView("inbox")}
          className="flex items-center gap-2.5 text-primary hover:text-primary/80 transition-all group"
        >
          <div className="w-7 h-7 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center text-primary-foreground text-[11px] font-black shadow-md group-hover:rotate-[-3deg] transition-transform duration-300">
            DH
          </div>
          <span className="text-foreground font-bold text-base tracking-tight">
            DougHub
          </span>
        </button>

        {/* Center: Search */}
        <div className="flex-1 max-w-md">
          <SearchBar />
        </div>

        {/* Right: Browser badge */}
        <div className="flex items-center gap-2">
          {isBrowserMode && (
            <Badge variant="outline" className="text-[11px] h-6">
              Browser Mode
            </Badge>
          )}
        </div>
      </div>
    </header>
  );
}
