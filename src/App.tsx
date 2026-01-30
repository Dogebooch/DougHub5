import { useEffect } from "react";
import { Toaster, toast } from "sonner";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAppStore } from "@/stores/useAppStore";
import { useDevStore } from "@/stores/useDevStore";
import { AppLayout } from "@/components/layout/AppLayout";

export default function App() {
  const { isLoading, initialize } = useAppStore();

  useEffect(() => {
    initialize();

    // Listen for Ollama status updates
    const cleanupOllama = window.api?.ai?.onOllamaStatus?.((payload) => {
      switch (payload.status) {
        case "starting":
          toast.info(payload.message, { id: "ollama-status" });
          break;
        case "started":
          toast.success(payload.message, { id: "ollama-status" });
          break;
        case "failed":
          toast.error(payload.message, { id: "ollama-status" });
          break;
        case "already-running":
          // Transparent to user, just log it
          console.log("[AI Status]", payload.message);
          break;
      }
    });

    let cleanupLog: (() => void) | undefined;
    let handleKeyDown: ((e: KeyboardEvent) => void) | undefined;

    if (window.api?.dev) {
      cleanupLog = window.api.dev.onAILog((payload) => {
        useDevStore.getState().addLog(payload);
      });

      handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === "KeyD") {
          e.preventDefault();
          useDevStore.getState().togglePanel();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      if (cleanupOllama) cleanupOllama();
      if (cleanupLog) cleanupLog();
      if (handleKeyDown) window.removeEventListener("keydown", handleKeyDown);
    };
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading DougHub...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <AppLayout />
      <Toaster position="bottom-center" richColors />
      <ShadcnToaster />
    </TooltipProvider>
  );
}
