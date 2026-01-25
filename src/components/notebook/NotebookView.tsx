import { useState, useEffect, useCallback } from "react";
import { BookOpen } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { TopicBrowser } from "./browser/TopicBrowser";
import { TopicPageView } from "./TopicPageView";

/**
 * NotebookView
 *
 * Container component for the Notebook layer.
 * Implements a list/detail pattern for Topic Pages.
 * Re-designed to use the smart TopicBrowser.
 */
export const NotebookView = () => {
  const { selectedItemId, viewOptions, setCurrentView } = useAppStore();

  const [selectedPageId, setSelectedPageId] = useState<string | null>(
    selectedItemId || null,
  );
  const [targetBlockId, setTargetBlockId] = useState<string | null>(
    viewOptions?.blockId || null,
  );

  // refreshKey to force re-fetch in TopicBrowser if needed
  const [refreshKey, setRefreshKey] = useState(0);

  // Sync selectedPageId with store's selectedItemId (deep linking)
  useEffect(() => {
    if (selectedItemId && selectedItemId !== selectedPageId) {
      setSelectedPageId(selectedItemId);
      if (viewOptions?.blockId) {
        setTargetBlockId(viewOptions.blockId);
      }
      // Clear the deep link after it's been handled to prevent recursion/stale state
      setCurrentView("notebook", null);
    }
  }, [selectedItemId, selectedPageId, viewOptions, setCurrentView]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Sidebar: Topic Browser (Redesign T139) */}
      <div className="w-80 border-r border-border/40 flex flex-col h-full shrink-0">
        <TopicBrowser
          key={refreshKey}
          selectedId={selectedPageId}
          onSelect={setSelectedPageId}
          onPageCreated={handleRefresh}
        />
      </div>

      {/* Main Content: Topic Page View (Article View) */}
      <div className="flex-1 h-full overflow-hidden">
        {selectedPageId ? (
          <TopicPageView
            pageId={selectedPageId}
            onRefresh={handleRefresh}
            targetBlockId={targetBlockId}
            onTargetBlockHandled={() => setTargetBlockId(null)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 bg-muted/5">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 opacity-50">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-foreground/70">Notebook</h3>
            <p className="max-w-xs text-center text-sm">
              Select a topic from the sidebar to view details, or use the
              searchbar above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
