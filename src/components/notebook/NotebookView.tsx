import { useState, useEffect } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { NotebookTopicPage, CanonicalTopic } from "@/types";
import { useAppStore } from "@/stores/useAppStore";

/**
 * NotebookView
 * 
 * Container component for the Notebook layer.
 * Implements a list/detail pattern for Topic Pages.
 */
export const NotebookView = () => {
  const { selectedItemId } = useAppStore();
  const [pages, setPages] = useState<NotebookTopicPage[]>([]);
  const [topics, setTopics] = useState<Map<string, CanonicalTopic>>(new Map());
  const [selectedPageId, setSelectedPageId] = useState<string | null>(selectedItemId || null);
  const [isLoading, setIsLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const pagesResult = await window.api.notebookPages.getAll();
        
        if (pagesResult.error) {
          console.error("Failed to fetch notebook pages:", pagesResult.error);
          setIsLoading(false);
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
                const topicResult = await window.api.canonicalTopics.getById(page.canonicalTopicId);
                if (topicResult.data) {
                  topicMap.set(page.canonicalTopicId, topicResult.data);
                }
              } catch (err) {
                console.error(`Failed to fetch topic ${page.canonicalTopicId}:`, err);
              }
            }
          })
        );
        
        setTopics(topicMap);
      } catch (error) {
        console.error("Error in NotebookView data fetching:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Loading State
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading Notebook...</p>
      </div>
    );
  }

  // Empty State
  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-2">
          <BookOpen className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">No topic pages yet</h2>
          <p className="text-muted-foreground max-w-xs">
            Create a topic page to start organizing your knowledge.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar: Topic Page List Placeholder */}
      <div className="w-64 border-r bg-muted/30 flex flex-col h-full">
        <div className="p-4 border-b font-medium text-sm text-muted-foreground uppercase tracking-wider">
          Topic Pages
        </div>
        <div className="flex-1 overflow-y-auto">
          {/* <TopicPageList pages={pages} topics={topics} selectedId={selectedPageId} onSelect={setSelectedPageId} /> */}
          <div className="p-4 text-xs italic text-muted-foreground">
            TopicPageList component will render here. ({pages.length} pages, {topics.size} topics)
            {selectedPageId && (
              <button 
                onClick={() => setSelectedPageId(null)}
                className="block mt-2 text-primary hover:underline"
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content: Topic Page View Placeholder */}
      <div className="flex-1 h-full overflow-y-auto bg-background">
        {selectedPageId ? (
          <div className="h-full">
            {/* <TopicPageView pageId={selectedPageId} /> */}
            <div className="p-8 text-center text-muted-foreground">
              TopicPageView for {selectedPageId} will render here.
            </div>
          </div>
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
