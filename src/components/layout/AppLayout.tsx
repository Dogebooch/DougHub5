import { useState, useEffect } from "react";
import { Header } from "./Header";
import { QuickActionsBar } from "./QuickActionsBar";
import { CommandPalette } from "@/components/modals/CommandPalette";
import { QuickDumpModal } from "@/components/modals/QuickDumpModal";
import { CaptureInterface } from "@/components/capture/CaptureInterface";
import { ReviewInterface } from "@/components/review/ReviewInterface";
import { useAppStore } from "@/stores/useAppStore";

export function AppLayout() {
  const currentView = useAppStore((state) => state.currentView);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isQuickDumpOpen, setIsQuickDumpOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const openQuickDump = () => setIsQuickDumpOpen(true);
  const closeQuickDump = () => setIsQuickDumpOpen(false);

  const renderView = () => {
    switch (currentView) {
      case "review":
        return <ReviewInterface />;
      case "settings":
        // TODO: Create a SettingsInterface component with sections for:
        // - FSRS Algorithm Parameters: Allow user to view and customize their
        //   personalized learning algorithm settings (retention target, weights,
        //   learning steps, maximum interval, etc.)
        // - Review Statistics: Display retrievability curves, review history
        // - Data Management: Export/import, reset progress
        return (
          <div className="p-8 text-center">
            <h1 className="text-2xl font-semibold mb-4">Settings</h1>
            <p className="text-muted-foreground">
              Settings page coming soon...
            </p>
          </div>
        );
      case "capture":
      default:
        return <CaptureInterface />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-1000 selection:bg-primary/20">
      <Header />
      <QuickActionsBar onOpenQuickDump={openQuickDump} />
      <main className="mx-auto max-w-7xl px-6 py-12">{renderView()}</main>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenQuickDump={openQuickDump}
      />

      <QuickDumpModal isOpen={isQuickDumpOpen} onClose={closeQuickDump} />
    </div>
  );
}
