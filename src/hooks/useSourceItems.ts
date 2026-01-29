import { useState, useEffect, useCallback } from 'react';
import { SourceItem } from '@/types';

interface UseSourceItemsOptions {
  /**
   * If provided, only items with this status will be fetched initially.
   * If not provided, all items are fetched.
   */
  status?: 'inbox' | 'processed' | 'curated';
}

export function useSourceItems(options: UseSourceItemsOptions = {}) {
  const [items, setItems] = useState<SourceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [extractingIds, setExtractingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let result;
      if (options.status) {
        result = await window.api.sourceItems.getByStatus(options.status);
      } else {
        result = await window.api.sourceItems.getAll();
      }

      if (result.data) {
        setItems(result.data);
      } else if (result.error) {
        setError(result.error);
        console.error("Failed to fetch items:", result.error);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error("Error fetching items:", err);
    } finally {
      setIsLoading(false);
    }
  }, [options.status]);

  // Initial fetch
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Listen for new items
  useEffect(() => {
    if (typeof window !== "undefined" && window.api?.sourceItems?.onNew) {
      const unsubscribe = window.api.sourceItems.onNew((item: SourceItem) => {
        // If we constitute a specific status view, only add if it matches
        if (options.status && item.status !== options.status) {
            return; 
        }

        setItems((prev) => {
          // Prevent duplicates, add to top
          const filtered = prev.filter((i) => i.id !== item.id);
          return [item, ...filtered];
        });
      });
      return unsubscribe;
    }
  }, [options.status]);

  // Listen for AI extraction status updates
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.api?.sourceItems?.onAIExtraction
    ) {
      const unsubscribe = window.api.sourceItems.onAIExtraction((payload) => {
        const { sourceItemId, status, metadata } = payload;

        if (status === "started") {
          setExtractingIds((prev) => new Set(prev).add(sourceItemId));
        } else {
          setExtractingIds((prev) => {
            const next = new Set(prev);
            next.delete(sourceItemId);
            return next;
          });

          // Update item metadata if completed
          if (status === "completed" && metadata) {
            setItems((prev) =>
              prev.map((item) =>
                item.id === sourceItemId
                  ? { ...item, metadata: { ...item.metadata, ...metadata } }
                  : item
              )
            );
          }
        }
      });
      return unsubscribe;
    }
  }, []);

  // CRUD Helpers
  const deleteItem = useCallback(async (id: string) => {
    try {
      const result = await window.api.sourceItems.delete(id);
      if (!result.error) {
        setItems(prev => prev.filter(i => i.id !== id));
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }, []);

  const updateItemStatus = useCallback(async (id: string, newStatus: 'inbox' | 'processed' | 'curated') => {
    try {
        const result = await window.api.sourceItems.update(id, { status: newStatus });
        if(!result.error) {
             // If we are in a filtered view, we might want to remove it from the list
             // OR just update it. 
             // Behavior: If we are viewing 'inbox' and we move to 'curated', it should disappear.
             if (options.status && newStatus !== options.status) {
                 setItems(prev => prev.filter(i => i.id !== id));
             } else {
                 setItems(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i));
             }
             return { success: true };
        }
        return { success: false, error: result.error };
    } catch (err) {
        return { success: false, error: String(err) };
    }
  }, [options.status]);


  return {
    items,
    isLoading,
    error,
    extractingIds,
    refresh: fetchItems,
    deleteItem,
    updateItemStatus,
    setItems // Expose setter just in case, though standard operations should cover it
  };
}
