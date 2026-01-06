import { useState, useEffect } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { QuickDumpFAB } from "./QuickDumpFAB";
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
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
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
    <div className="h-screen overflow-hidden bg-background text-foreground transition-colors duration-300 selection:bg-primary/20 relative overflow-x-hidden flex flex-col">
      {/* Subtle organic background vignette and noise */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(63,150,143,0.04)_0%,transparent_60%)]" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      <Header />

      <div className="flex flex-1 relative z-10">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-6 py-8">{renderView()}</div>
        </main>
      </div>

      {/* Floating Quick Dump button */}
      <QuickDumpFAB onClick={openQuickDump} />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenQuickDump={openQuickDump}
      />

      <QuickDumpModal isOpen={isQuickDumpOpen} onClose={closeQuickDump} />
    </div>
  );
}
