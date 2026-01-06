import { SearchBar } from "./SearchBar";
import { useAppStore } from "@/stores/useAppStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotateCw } from "lucide-react";

export function Header() {
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const isBrowserMode = typeof window !== "undefined" && !window.api;

  return (
    <header className="border-b border-black/30 bg-black/40 backdrop-blur-xl sticky top-0 z-50 shadow-md">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between gap-6 mb-4">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setCurrentView("capture")}
              className="text-2xl font-sans font-black tracking-tighter text-primary hover:text-primary/80 transition-all flex items-center gap-3 group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center text-primary-foreground text-sm font-black shadow-[0_5px_15px_-5px_rgba(63,150,143,0.5)] rotate-3 group-hover:rotate-0 transition-all duration-500">
                DH
              </div>
              <span className="text-foreground tracking-[-0.05em] uppercase text-xl font-black">
                DougHub
              </span>
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
