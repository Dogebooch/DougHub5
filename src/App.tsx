import { useEffect } from "react";
import { Toaster, toast } from "sonner";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import { useAppStore } from "@/stores/useAppStore";
import { AppLayout } from "@/components/layout/AppLayout";

export default function App() {
  const { isLoading, initialize } = useAppStore();

  useEffect(() => {
    initialize();

    // Listen for Ollama status updates
    const cleanup = window.api.ai.onOllamaStatus((payload) => {
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

    return () => cleanup();
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
    <>
      <AppLayout />
      <Toaster position="bottom-center" richColors />
      <ShadcnToaster />
    </>
  );
}
