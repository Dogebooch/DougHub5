import { useState, useEffect } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { QuickCaptureFAB } from "./QuickCaptureFAB";
import { CommandPalette } from "@/components/modals/CommandPalette";
import { QuickCaptureModal } from "@/components/modals/QuickCaptureModal";
import { ReviewInterface } from "@/components/review/ReviewInterface";
import { InboxView } from "@/components/knowledgebank/InboxView";
import { KnowledgeBankView } from "@/components/knowledgebank/KnowledgeBankView";
import { NotebookView } from "@/components/notebook/NotebookView";
import { WeakTopicsView } from "@/components/smartviews/WeakTopicsView";
import { CardBrowserView } from "@/components/cards/CardBrowserView";
import { SettingsView } from "@/components/settings/SettingsView";
import { useAppStore } from "@/stores/useAppStore";
import type { SourceItem } from "@/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export function AppLayout() {
  const currentView = useAppStore((state) => state.currentView);
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const refreshCounts = useAppStore((state) => state.refreshCounts);
  const onNewSourceItem = useAppStore((state) => state.onNewSourceItem);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.api?.sourceItems?.onNew) {
      const unsubscribe = window.api.sourceItems.onNew((item: SourceItem) => {
        onNewSourceItem();

        toast({
          title: "Browser Capture Received",
          description: `Captured: ${item.title || "Untitled Item"}`,
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentView("inbox")}
            >
              View In Inbox
            </Button>
          ),
        });
      });
      return unsubscribe;
    }
  }, [onNewSourceItem, toast, setCurrentView]);

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
        return <NotebookView />;
      case "today":
        return (
          <div className="p-8 text-center space-y-4">
            <h1 className="text-2xl font-semibold">Today's Learning</h1>
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
        return <WeakTopicsView />;
      case "topics":
      case "stats":
        return (
          <div className="p-8 text-center space-y-4">
            <h1 className="text-2xl font-semibold capitalize">{currentView}</h1>
            <p className="text-muted-foreground">View removed</p>
          </div>
        );
      case "inbox":
        return <InboxView />;
      case "knowledgebank":
        return <KnowledgeBankView />;
      case "cards":
        return <CardBrowserView />;
      case "settings":
        return <SettingsView />;
      default:
        // Fallback: redirect to inbox if unknown view
        console.warn(`Unknown view: ${currentView}, redirecting to inbox`);
        setTimeout(() => setCurrentView("inbox"), 0);
        return <InboxView />;
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground transition-colors duration-300 selection:bg-primary/20 relative overflow-x-hidden flex flex-col">
      {/* Subtle organic background vignette and noise */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(63,150,143,0.04)_0%,transparent_60%)]" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      <Header />

      <div className="flex flex-1 relative z-10 overflow-hidden">
        <Sidebar />
        <main
          className={cn("flex-1", currentView !== "cards" && "overflow-y-auto")}
        >
          <div
            className={cn(
              "mx-auto",
              currentView === "cards"
                ? "h-full w-full max-w-none"
                : "max-w-4xl px-6 py-8"
            )}
          >
            {renderView()}
          </div>
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
