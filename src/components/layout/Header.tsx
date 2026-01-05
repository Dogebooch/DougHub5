import { SearchBar } from "./SearchBar";
import { useAppStore } from "@/stores/useAppStore";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const isBrowserMode = typeof window !== "undefined" && !window.api;

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center gap-6 mb-4">
          <button
            onClick={() => setCurrentView("capture")}
            className="text-2xl font-semibold text-foreground hover:text-primary transition-colors"
          >
            DougHub
          </button>
          {isBrowserMode && (
            <Badge variant="outline" className="text-xs">
              Browser Mode (In-Memory)
            </Badge>
          )}
        </div>
        <SearchBar />
      </div>
    </header>
  );
}
