import { SearchBar } from "./SearchBar";
import { useAppStore } from "@/stores/useAppStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";

export function Header() {
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const isBrowserMode = typeof window !== "undefined" && !window.api;

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between gap-6 mb-4">
          <div className="flex items-center gap-6">
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
          {!isBrowserMode && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.api.reloadApp()}
              title="Reload app"
              className="opacity-30 hover:opacity-100 transition-opacity"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          )}
        </div>
        <SearchBar />
      </div>
    </header>
  );
}
