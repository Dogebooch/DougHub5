import { useEffect } from "react";
import { Toaster } from "sonner";
import { useAppStore } from "@/stores/useAppStore";
import { AppLayout } from "@/components/layout/AppLayout";

export default function App() {
  const { isLoading, initialize } = useAppStore();

  useEffect(() => {
    initialize();
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
      <Toaster position="bottom-right" richColors />
    </>
  );
}
