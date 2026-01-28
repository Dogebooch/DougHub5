import { SearchBar } from "./SearchBar";
import { useAppStore } from "@/stores/useAppStore";
import { useDevStore } from "@/stores/useDevStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Bug } from "lucide-react";

export function Header() {
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const { isOpen, togglePanel } = useDevStore();
  const isBrowserMode = typeof window !== "undefined" && !window.api;

  return (
    <header className="h-14 border-b border-border/50 bg-surface-base/80 backdrop-blur-md sticky top-0 z-50">
      <div className="h-full px-4 flex items-center justify-between gap-4">
        {/* Logo and title */}
        <button
          onClick={() => setCurrentView("inbox")}
          className="flex items-center gap-2.5 text-primary hover:text-primary/80 transition-all group"
        >
          {/* Abstract geometric logo - interlocking knowledge nodes */}
          <svg
            viewBox="0 0 28 28"
            className="w-7 h-7 group-hover:rotate-[-3deg] transition-transform duration-300"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background rounded square */}
            <rect
              width="28"
              height="28"
              rx="6"
              className="fill-primary"
            />
            {/* Three interlocking circles representing connected knowledge */}
            <circle
              cx="10"
              cy="11"
              r="5"
              className="fill-primary-foreground/90"
            />
            <circle
              cx="18"
              cy="11"
              r="5"
              className="fill-primary-foreground/70"
            />
            <circle
              cx="14"
              cy="18"
              r="5"
              className="fill-primary-foreground/50"
            />
            {/* Center intersection highlight */}
            <circle
              cx="14"
              cy="13"
              r="2.5"
              className="fill-primary"
            />
          </svg>
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

          {!isBrowserMode && window.api?.dev && (
            <Button
              variant="ghost"
              size="icon"
              className={
                isOpen ? "text-primary bg-primary/10" : "text-muted-foreground"
              }
              onClick={togglePanel}
              title="Toggle AI Dev Panel (Cmd+Shift+D)"
            >
              <Bug className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
