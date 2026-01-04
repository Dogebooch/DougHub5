import { SearchBar } from "./SearchBar";
import { useAppStore } from "@/stores/useAppStore";

export function Header() {
  const setCurrentView = useAppStore((state) => state.setCurrentView);

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
        </div>
        <SearchBar />
      </div>
    </header>
  );
}
