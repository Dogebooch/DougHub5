import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, AppWindow } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function WindowModeToggle() {
  const [isElectronVisible, setIsElectronVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Check if we're in Electron or browser
  const isElectron = typeof window !== "undefined" && window.api;

  useEffect(() => {
    if (isElectron) {
      // Check initial window visibility
      window.api.app.isWindowVisible().then((result) => {
        if (result.data !== undefined) {
          setIsElectronVisible(result.data);
        }
      });
    }
  }, [isElectron]);

  const toggleWindowMode = async () => {
    if (!isElectron) return;

    setIsLoading(true);
    try {
      const newVisibility = !isElectronVisible;
      const result = await window.api.app.setWindowVisibility(newVisibility);

      if (result.data !== undefined) {
        setIsElectronVisible(result.data);

        // If hiding the window, inform the user via notification
        if (!newVisibility) {
          // Small delay to show the change
          setTimeout(() => {
            alert(
              "Electron window hidden.\n\nOpen http://localhost:3000 in your browser to continue working.\n\nTo show the window again, use the toggle in your browser.",
            );
          }, 100);
        }
      }
    } catch (error) {
      console.error("Failed to toggle window mode:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show in browser mode - only when running in Electron
  if (!isElectron) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleWindowMode}
          disabled={isLoading}
          className="h-8 gap-2 text-xs"
        >
          {isElectronVisible ? (
            <>
              <Monitor className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Dev Mode</span>
            </>
          ) : (
            <>
              <AppWindow className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Deploy Mode</span>
            </>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          {isElectronVisible
            ? "Hide Electron window (work in browser)"
            : "Show Electron window (native app)"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
