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
import { CardGenerationModal } from "./CardGenerationModal";
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
}

export const TopicPageView: React.FC<TopicPageViewProps> = ({
  pageId,
  onRefresh,
}) => {
  const { addCard } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<NotebookTopicPage | null>(null);
  const [topic, setTopic] = useState<CanonicalTopic | null>(null);
  const [blocks, setBlocks] = useState<NotebookBlock[]>([]);
  const [addBlockOpen, setAddBlockOpen] = useState(false);

  // Generation Modal State
  const [genModalOpen, setGenModalOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [activeBlock, setActiveBlock] = useState<NotebookBlock | null>(null);

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

  const handleGenerateCardTrigger = (text: string, block: NotebookBlock) => {
    setSelectedText(text);
    setActiveBlock(block);
    setGenModalOpen(true);
  };

  const handleBlockEdit = (block: NotebookBlock) => {
    setEditingBlock(block);
    setEditModalOpen(true);
  };

  const handleBlockSave = async (blockId: string, newContent: string) => {
    // Find the original block to compare
    const originalBlock = blocks.find((b) => b.id === blockId);

    // Skip API call if content unchanged (shouldn't happen due to UI guards, but belt-and-suspenders)
    if (originalBlock && originalBlock.content === newContent) {
      return;
    }

    try {
      const result = await window.api.notebookBlocks.update(blockId, {
        content: newContent,
      });

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
        prev.map((b) => (b.id === blockId ? { ...b, content: newContent } : b)),
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

  type GeneratedCardData = {
    format:
      | "qa"
      | "cloze"
      | "overlapping-cloze"
      | "vignette"
      | "image-occlusion"
      | "procedural";
    front: string;
    back: string;
  };

  const handleCreateCard = async (data: GeneratedCardData) => {
    if (!activeBlock || !topic) return;

    // Map AI format to database card type
    let cardType: CardWithFSRS["cardType"] = "qa";
    if (data.format === "cloze") cardType = "cloze";
    if (data.format === "overlapping-cloze") cardType = "list-cloze";
    if (data.format === "vignette") cardType = "vignette";

    const newCard: CardWithFSRS = {
      id: crypto.randomUUID(),
      front: data.front,
      back: data.back,
      noteId: "", // Legacy field
      cardType: cardType,
      notebookTopicPageId: pageId,
      sourceBlockId: activeBlock.id,
      tags: [],
      dueDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      parentListId: null,
      listPosition: null,
      aiTitle: null,
      // FSRS defaults
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      lastReview: null,
    };

    const result = await addCard(newCard);
    if (result.success) {
      toast({
        title: "Card Created",
        description: "Successfully added to your collection.",
      });
      // Refresh block card counts
      fetchData();
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to create card",
        variant: "destructive",
      });
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
              Add content from Knowledge Bank to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {blocks.map((block) => (
              <NotebookBlockComponent
                key={block.id}
                block={block}
                onRefresh={fetchData}
                onGenerateCard={(text) =>
                  handleGenerateCardTrigger(text, block)
                }
                onEdit={handleBlockEdit}
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
          Add from Knowledge Bank
        </Button>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-block">
                <Button
                  variant="outline"
                  disabled
                  className="gap-2 h-9 opacity-60"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate All Cards
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Select text in blocks to generate cards</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </footer>

      {/* MODALS */}
      <AddBlockModal
        open={addBlockOpen}
        onOpenChange={setAddBlockOpen}
        notebookTopicPageId={pageId}
        onSuccess={fetchData}
      />

      {activeBlock && topic && (
        <CardGenerationModal
          open={genModalOpen}
          onOpenChange={setGenModalOpen}
          selectedText={selectedText}
          blockContent={activeBlock.content}
          topicName={topic.canonicalName}
          onCreateCard={handleCreateCard}
        />
      )}

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
