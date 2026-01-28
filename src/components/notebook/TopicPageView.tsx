import React, { useCallback, useEffect, useState } from "react";
import { BookOpen, Sparkles, Plus, Loader2, Library } from "lucide-react";
import {
  NotebookTopicPage,
  NotebookBlock,
  CanonicalTopic,
  CardWithFSRS,
} from "@/types";
import { NotebookBlockComponent } from "./NotebookBlock";
import { AddBlockModal } from "./AddBlockModal";
import { BlockEditModal } from "./BlockEditModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppStore } from "@/stores/useAppStore";
import { toast } from "@/hooks/use-toast";

interface TopicPageViewProps {
  pageId: string;
  onRefresh: () => void;
  targetBlockId?: string | null;
  onTargetBlockHandled?: () => void;
}

export const TopicPageView: React.FC<TopicPageViewProps> = ({
  pageId,
  onRefresh,
  targetBlockId,
  onTargetBlockHandled,
}) => {
  const { addCard, setCurrentView } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<NotebookTopicPage | null>(null);
  const [topic, setTopic] = useState<CanonicalTopic | null>(null);
  const [blocks, setBlocks] = useState<NotebookBlock[]>([]);
  const [addBlockOpen, setAddBlockOpen] = useState(false);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<NotebookBlock | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch page
      const pageResult = await window.api.notebookPages.getById(pageId);
      if (pageResult.error) throw new Error(pageResult.error);
      if (!pageResult.data) throw new Error("Page not found");

      const pageData = pageResult.data;
      setPage(pageData);

      // 2. Fetch topic and blocks in parallel
      const [topicResult, blocksResult] = await Promise.all([
        window.api.canonicalTopics.getById(pageData.canonicalTopicId),
        window.api.notebookBlocks.getByPage(pageId),
      ]);

      if (topicResult.error) throw new Error(topicResult.error);
      if (blocksResult.error) throw new Error(blocksResult.error);

      setTopic(topicResult.data);
      setBlocks(blocksResult.data || []);

      // Notify parent of refresh if needed (e.g. updating sidebar counts)
      onRefresh();
    } catch (err) {
      console.error("Error fetching topic page:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load topic page",
      );
    } finally {
      setLoading(false);
    }
  }, [pageId, onRefresh]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBlockEdit = (block: NotebookBlock) => {
    setEditingBlock(block);
    setEditModalOpen(true);
  };

  const handleNavigateToBlock = useCallback(
    async (blockId: string, targetPageId: string) => {
      if (targetPageId === pageId) {
        // Same page - just scroll
        const el = document.getElementById(`block-${blockId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-primary", "ring-offset-2");
          setTimeout(() => {
            el.classList.remove("ring-2", "ring-primary", "ring-offset-2");
          }, 2000);
        }
      } else {
        // Different page - use store to navigate
        setCurrentView("notebook", targetPageId, { blockId });
      }
    },
    [pageId, setCurrentView],
  );

  // Handle target block scrolling on mount or when transition finishes
  useEffect(() => {
    if (targetBlockId && !loading && blocks.length > 0) {
      // Small timeout to ensure DOM is ready
      const timer = setTimeout(() => {
        const el = document.getElementById(`block-${targetBlockId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-2", "ring-primary", "ring-offset-2");
          setTimeout(() => {
            el.classList.remove("ring-2", "ring-primary", "ring-offset-2");
          }, 2000);
          onTargetBlockHandled?.();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [targetBlockId, loading, blocks, onTargetBlockHandled]);

  const handleBlockSave = async (
    blockId: string,
    updates: {
      content?: string;
      userInsight?: string;
      calloutType?: "pearl" | "trap" | "caution" | null;
    },
  ) => {
    // Find the original block to compare
    const originalBlock = blocks.find((b) => b.id === blockId);

    // Skip API call if nothing to update
    if (!originalBlock || Object.keys(updates).length === 0) {
      return;
    }

    try {
      const result = await window.api.notebookBlocks.update(blockId, updates);

      if (result.error) {
        toast({
          title: "Save Failed",
          description: result.error,
          variant: "destructive",
        });
        throw new Error(result.error); // Propagate to keep modal open
      }

      // Optimistic update - update local state immediately
      setBlocks((prev) =>
        prev.map((b) => (b.id === blockId ? { ...b, ...updates } : b)),
      );

      toast({
        title: "Block Updated",
        description: "Your changes have been saved.",
      });

      // Background refresh to sync any other changes (like updatedAt)
      fetchData();
    } catch (error) {
      // Error already toasted above, just rethrow to keep modal open
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-2" />
        <p>Loading topic page...</p>
      </div>
    );
  }

  if (error || !topic || !page) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-8 text-center">
        <p className="font-semibold mb-2">Error Loading Page</p>
        <p className="text-sm opacity-80 mb-4">
          {error || "Something went wrong"}
        </p>
        <Button variant="outline" onClick={fetchData}>
          Try Again
        </Button>
      </div>
    );
  }

  const totalCards = blocks.reduce((sum, b) => sum + (b.cardCount || 0), 0);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* HEADER */}
      <header className="flex-shrink-0 p-6 border-b bg-card">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 text-primary">
              <BookOpen className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                Notebook Topic
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 text-card-foreground">
              {topic.canonicalName}
            </h1>
            <div className="flex flex-wrap gap-2">
              {topic.aliases.length > 0 ? (
                topic.aliases.map((alias) => (
                  <Badge
                    key={alias}
                    variant="secondary"
                    className="text-[11px] px-1.5 py-0.5.5 font-medium h-5"
                  >
                    {alias}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-card-muted italic">
                  No aliases
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-4 text-right">
            <div className="flex flex-col items-end">
              <div className="text-2xl font-bold text-card-foreground">
                {totalCards}
              </div>
              <div className="text-[11px] uppercase font-bold text-card-muted leading-none">
                Cards
              </div>
            </div>
            <div className="flex flex-col items-end border-l pl-4">
              <div className="text-2xl font-bold text-card-foreground">
                {blocks.length}
              </div>
              <div className="text-[11px] uppercase font-bold text-card-muted leading-none">
                Blocks
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* BLOCKS LIST */}
      <div className="flex-1 overflow-y-auto p-6">
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl text-muted-foreground bg-muted/20">
            <Library className="w-12 h-12 mb-3 opacity-20" />
            <p className="font-medium text-sm">No blocks yet.</p>
            <p className="text-xs opacity-70">
              Add content from Library to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {blocks.map((block) => (
              <NotebookBlockComponent
                key={block.id}
                block={block}
                topicName={topic?.canonicalName || ""}
                onRefresh={fetchData}
                onEdit={handleBlockEdit}
                onNavigate={handleNavigateToBlock}
              />
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="flex-shrink-0 p-4 border-t bg-muted/30 flex justify-between items-center px-8">
        <Button
          variant="default"
          className="gap-2 h-9"
          onClick={() => setAddBlockOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Add from Library
        </Button>
      </footer>

      {/* MODALS */}
      <AddBlockModal
        open={addBlockOpen}
        onOpenChange={setAddBlockOpen}
        notebookTopicPageId={pageId}
        onSuccess={fetchData}
      />

      <BlockEditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        block={editingBlock}
        topicName={topic?.canonicalName || ""}
        onSave={handleBlockSave}
      />
    </div>
  );
};

export default TopicPageView;
