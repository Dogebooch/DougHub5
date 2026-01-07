import { useState, useEffect, useCallback } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { NotebookTopicPage, CanonicalTopic } from "@/types";
import { useAppStore } from "@/stores/useAppStore";
import { TopicPageList } from "./TopicPageList";
import { TopicPageView } from "./TopicPageView";

/**
 * NotebookView
 *
 * Container component for the Notebook layer.
 * Implements a list/detail pattern for Topic Pages.
 */
export const NotebookView = () => {
  const { selectedItemId, setCurrentView } = useAppStore();
  const [pages, setPages] = useState<NotebookTopicPage[]>([]);
  const [topics, setTopics] = useState<Map<string, CanonicalTopic>>(new Map());
  const [selectedPageId, setSelectedPageId] = useState<string | null>(
    selectedItemId || null
  );
  const [isLoading, setIsLoading] = useState(true);

  // Sync selectedPageId with store's selectedItemId (deep linking)
  useEffect(() => {
    if (selectedItemId && selectedItemId !== selectedPageId) {
      setSelectedPageId(selectedItemId);
      // Clear the deep link after it's been handled to prevent recursion/stale state
      setCurrentView("notebook", null);
    }
  }, [selectedItemId, selectedPageId, setCurrentView]);

  // Load data - extracted to useCallback for child components
  const fetchData = useCallback(async () => {
    try {
      const pagesResult = await window.api.notebookPages.getAll();

      if (pagesResult.error) {
        console.error("Failed to fetch notebook pages:", pagesResult.error);
        return;
      }

      const fetchedPages = pagesResult.data || [];
      setPages(fetchedPages);

      // Fetch canonical topics for each page to show names
      const topicMap = new Map<string, CanonicalTopic>();
      await Promise.all(
        fetchedPages.map(async (page) => {
          if (page.canonicalTopicId && !topicMap.has(page.canonicalTopicId)) {
            try {
              const topicResult = await window.api.canonicalTopics.getById(
                page.canonicalTopicId
              );
              if (topicResult.data) {
                topicMap.set(page.canonicalTopicId, topicResult.data);
              }
            } catch (err) {
              console.error(
                `Failed to fetch topic ${page.canonicalTopicId}:`,
                err
              );
            }
          }
        })
      );

      setTopics(topicMap);
    } catch (error) {
      console.error("Error in NotebookView data fetching:", error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const doInitialLoad = async () => {
      setIsLoading(true);
      await fetchData();
      setIsLoading(false);
    };

    doInitialLoad();
  }, [fetchData]);

  // Loading State
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">
          Loading Notebook...
        </p>
      </div>
    );
  }

  // Empty State - but we still want to show the container so we can create pages
  // Only show the big empty state if we really want to block the UI
  // Requirement 6 in T41.1 says show empty state when no pages exist.
  // Requirement 4 in T41.2 says TopicPageList should handle empty states too.
  // I will keep the full-screen empty state if pages.length === 0,
  // but I need to make sure the user can still create a page.
  // Wait, if pages.length === 0, NotebookView returns early.
  // Let's modify this so TopicPageList is always visible or the empty state has a button.
  if (pages.length === 0) {
    return (
      <div className="flex h-full overflow-hidden">
        {/* Sidebar still visible so user can click "New Topic Page" */}
        <div className="w-64 border-r bg-muted/30 flex flex-col h-full">
          <TopicPageList
            pages={pages}
            topics={topics}
            selectedId={selectedPageId}
            onSelect={setSelectedPageId}
            onPageCreated={fetchData}
          />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-8 text-center bg-background">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-2">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">No topic pages yet</h2>
            <p className="text-muted-foreground max-w-xs">
              Create a topic page from the sidebar to start organizing your
              knowledge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar: Topic Page List */}
      <div className="w-64 border-r bg-muted/30 flex flex-col h-full">
        <TopicPageList
          pages={pages}
          topics={topics}
          selectedId={selectedPageId}
          onSelect={setSelectedPageId}
          onPageCreated={fetchData}
        />
      </div>

      {/* Main Content: Topic Page View */}
      <div className="flex-1 h-full bg-background">
        {selectedPageId ? (
          <TopicPageView pageId={selectedPageId} onRefresh={fetchData} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
            <BookOpen className="w-12 h-12 mb-4 opacity-20" />
            <p>Select a topic page from the sidebar to view details.</p>
          </div>
        )}
      </div>
    </div>
  );
};
