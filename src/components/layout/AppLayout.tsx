import { useState, useEffect } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { QuickCaptureFAB } from "./QuickCaptureFAB";
import { CommandPalette } from "@/components/modals/CommandPalette";
import { QuickCaptureModal } from "@/components/modals/QuickCaptureModal";
import { CaptureInterface } from "@/components/capture/CaptureInterface";
import { ReviewInterface } from "@/components/review/ReviewInterface";
import { InboxView } from "@/components/knowledgebank/InboxView";
import { KnowledgeBankView } from "@/components/knowledgebank/KnowledgeBankView";
import { SmartViewSidebar } from "./SmartViewSidebar";
import { useAppStore } from "@/stores/useAppStore";

export function AppLayout() {
  const currentView = useAppStore((state) => state.currentView);
  const selectedItemId = useAppStore((state) => state.selectedItemId);
  const refreshCounts = useAppStore((state) => state.refreshCounts);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command Palette
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "f")) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }

      // Quick Capture (Ctrl+Shift+S)
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "s"
      ) {
        e.preventDefault();
        setIsQuickCaptureOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const openQuickCapture = () => setIsQuickCaptureOpen(true);
  const closeQuickCapture = () => setIsQuickCaptureOpen(false);

  const renderView = () => {
    switch (currentView) {
      case "review":
        return <ReviewInterface />;
      case "notebook":
        return (
          <div className="p-8 text-center space-y-4">
            <h1 className="text-2xl font-semibold">Notebook</h1>
            <p className="text-muted-foreground">
              Notebook and topic pages coming soon.
              {selectedItemId && (
                <span className="block mt-2 text-primary font-mono text-xs">
                  Target ID: {selectedItemId}
                </span>
              )}
            </p>
          </div>
        );
      case "today":
        return (
          <div className="p-8 text-center space-y-4">
            <h1 className="text-2xl font-semibold">Today's Review</h1>
            <p className="text-muted-foreground">Coming soon...</p>
          </div>
        );
      case "queue":
        return (
          <div className="p-8 text-center space-y-4">
            <h1 className="text-2xl font-semibold">Study Queue</h1>
            <p className="text-muted-foreground">Coming soon...</p>
          </div>
        );
      case "weak":
        return (
          <div className="p-8 text-center space-y-4">
            <h1 className="text-2xl font-semibold">Weak Topics</h1>
            <p className="text-muted-foreground">Coming soon...</p>
          </div>
        );
      case "inbox":
        return <InboxView />;
      case "knowledgebank":
        return <KnowledgeBankView />;
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
        <aside className="w-56 border-r border-white/5 bg-black/10 backdrop-blur-sm pt-4 hidden lg:block">
          <SmartViewSidebar />
        </aside>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-6 py-8">{renderView()}</div>
        </main>
      </div>

      {/* Floating Quick Capture button */}
      <QuickCaptureFAB onClick={openQuickCapture} />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenQuickCapture={openQuickCapture}
      />

      <QuickCaptureModal
        isOpen={isQuickCaptureOpen}
        onClose={closeQuickCapture}
      />
    </div>
  );
}
