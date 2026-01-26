import React, {
  useCallback,
  useEffect,
  useState,
  useMemo,
  useRef,
} from "react";
import {
  ArrowLeft,
  Plus,
  Sparkles,
  Loader2,
  BarChart3,
  ChevronDown,
  Star,
  Layers,
  PenLine,
} from "lucide-react";
import {
  NotebookTopicPage,
  NotebookBlock,
  CanonicalTopic,
  SourceItem,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import { TopicHeader } from "./TopicHeader";
import { ArticleContent } from "./ArticleContent";
import { SourceFootnotes } from "./SourceFootnotes";
import { AddBlockModal } from "../AddBlockModal";
import { BlockEditModal } from "../BlockEditModal";
import { DirectAuthorModal } from "../DirectAuthorModal";
import { SourcePreviewPanel } from "../SourcePreviewPanel";
import { TopicCardGeneration } from "../cardgen";

interface TopicArticleViewProps {
  pageId: string;
  onBack?: () => void;
  onRefresh?: () => void;
}

interface BoardRelevanceData {
  questionsAttempted: number;
  correctCount: number;
  accuracy: number;
  testedConcepts: { concept: string; count: number }[];
  missedConcepts: { concept: string; sourceItemId: string }[];
}

/**
 * TopicArticleView
 *
 * AMBOSS-inspired prose reading experience for notebook topic pages.
 * Replaces the block-card view with flowing content, callouts, and footnotes.
 */
export function TopicArticleView({
  pageId,
  onBack,
  onRefresh,
}: TopicArticleViewProps) {
  const { toast } = useToast();
  const mountedRef = useRef(true);

  // Data state
  const [page, setPage] = useState<NotebookTopicPage | null>(null);
  const [topic, setTopic] = useState<CanonicalTopic | null>(null);
  const [blocks, setBlocks] = useState<NotebookBlock[]>([]);
  const [sourceItems, setSourceItems] = useState<Map<string, SourceItem>>(
    new Map(),
  );
  const [boardRelevance, setBoardRelevance] =
    useState<BoardRelevanceData | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addBlockOpen, setAddBlockOpen] = useState(false);
  const [boardPanelOpen, setBoardPanelOpen] = useState(true);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"all" | "highYield">("all");
  const [togglingBlockIds, setTogglingBlockIds] = useState<Set<string>>(
    new Set(),
  );

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<NotebookBlock | null>(null);

  // Card generation modal state
  const [cardGenOpen, setCardGenOpen] = useState(false);

  // Direct author modal state
  const [directAuthorOpen, setDirectAuthorOpen] = useState(false);

  // Fetch all data
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
        window.api.notebookBlocks.getByPage(pageId, {
          highYieldOnly: viewMode === "highYield",
        }),
      ]);

      if (topicResult.error) throw new Error(topicResult.error);
      if (blocksResult.error) throw new Error(blocksResult.error);

      const topicData = topicResult.data;
      const blocksData = blocksResult.data || [];

      setTopic(topicData);
      setBlocks(blocksData);

      // 3. Fetch source items for footnotes
      const sourceIds = [...new Set(blocksData.map((b) => b.sourceItemId))];
      const sourceMap = new Map<string, SourceItem>();

      await Promise.all(
        sourceIds.map(async (id) => {
          const result = await window.api.sourceItems.getById(id);
          if (result.data) {
            sourceMap.set(id, result.data);
          }
        }),
      );
      setSourceItems(sourceMap);

      // 4. Fetch board relevance if we have topic tags
      if (topicData) {
        const tags = [topicData.canonicalName, ...topicData.aliases];
        const relevanceResult =
          await window.api.insights.getBoardRelevance(tags);
        if (relevanceResult.data) {
          setBoardRelevance(relevanceResult.data);
        }
      }

      onRefresh?.();
    } catch (err) {
      console.error("Error fetching topic article:", err);
      setError(err instanceof Error ? err.message : "Failed to load topic");
    } finally {
      setLoading(false);
    }
  }, [pageId, onRefresh, viewMode]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build footnotes from blocks and source items
  const footnotes = useMemo(() => {
    return blocks.map((block, index) => {
      const source = sourceItems.get(block.sourceItemId);
      return {
        number: index + 1,
        sourceItemId: block.sourceItemId,
        title: source?.summary || source?.title || "Unknown source",
        siteName: source?.siteName || undefined,
      };
    });
  }, [blocks, sourceItems]);

  // Calculate stats
  const totalCards = useMemo(
    () => blocks.reduce((sum, b) => sum + (b.cardCount || 0), 0),
    [blocks],
  );

  const highYieldCount = useMemo(
    () => blocks.filter((b) => b.isHighYield).length,
    [blocks],
  );

  const handleFootnoteClick = (sourceItemId: string) => {
    setSelectedSourceId(sourceItemId);
  };

  const handleViewSource = (sourceItemId: string) => {
    setSelectedSourceId(sourceItemId);
  };

  const handleBlockEdit = (block: NotebookBlock) => {
    setEditingBlock(block);
    setEditModalOpen(true);
  };

  const handleStarToggle = async (blockId: string, currentValue: boolean) => {
    // Add to toggling set (disables button)
    setTogglingBlockIds((prev) => new Set(prev).add(blockId));

    // Optimistic update - instant UI feedback
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, isHighYield: !currentValue } : b,
      ),
    );

    try {
      // Persist to database using toggleHighYield handler
      const result = await window.api.notebookBlocks.toggleHighYield(blockId);

      if (result.error) {
        throw new Error(result.error);
      }

      // Update with server response (in case of any sync issues)
      if (mountedRef.current && result.data) {
        setBlocks((prev) =>
          prev.map((b) => (b.id === blockId ? result.data : b)),
        );
      }
    } catch (err) {
      // Revert optimistic update on error
      if (mountedRef.current) {
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === blockId ? { ...b, isHighYield: currentValue } : b,
          ),
        );
        toast({
          title: "Error",
          description:
            err instanceof Error ? err.message : "Failed to update block",
          variant: "destructive",
        });
      }
    } finally {
      // Remove from toggling set
      if (mountedRef.current) {
        setTogglingBlockIds((prev) => {
          const next = new Set(prev);
          next.delete(blockId);
          return next;
        });
      }
    }
  };

  const handleBlockSave = async (
    blockId: string,
    updates: {
      content?: string;
      userInsight?: string;
      calloutType?: "pearl" | "trap" | "caution" | null;
    },
  ) => {
    const result = await window.api.notebookBlocks.update(blockId, updates);
    if (result.error) {
      throw new Error(result.error);
    }
    // Refresh data to show changes
    await fetchData();
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-2" />
        <p className="text-sm">Loading article...</p>
      </div>
    );
  }

  // Error state
  if (error || !topic || !page) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive p-8 text-center">
        <p className="font-semibold mb-2">Error Loading Article</p>
        <p className="text-sm opacity-80 mb-4">
          {error || "Something went wrong"}
        </p>
        <Button variant="outline" onClick={fetchData}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-notebook-bg overflow-hidden">
      {/* Top Bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-border/30 bg-notebook-card">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Topics
          </Button>
        )}

        {/* View Mode Toggle */}
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) =>
            value && setViewMode(value as "all" | "highYield")
          }
          size="sm"
        >
          <ToggleGroupItem value="all" aria-label="Show all blocks">
            <Layers className="h-4 w-4 mr-1" />
            All ({blocks.length})
          </ToggleGroupItem>
          <ToggleGroupItem
            value="highYield"
            aria-label="Show only high-yield blocks"
          >
            <Star className="h-4 w-4 mr-1" />
            High-Yield ({highYieldCount})
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" disabled>
            <Sparkles className="h-4 w-4" />
            Generate Cards
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Board Relevance Panel */}
          {boardRelevance && boardRelevance.questionsAttempted > 0 && (
            <Collapsible
              open={boardPanelOpen}
              onOpenChange={setBoardPanelOpen}
              className="mb-8"
            >
              <div className="rounded-lg bg-notebook-board border border-primary/20 overflow-hidden">
                <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-primary uppercase tracking-wide">
                      Board Relevance
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary"
                    >
                      {boardRelevance.questionsAttempted} questions
                    </Badge>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        boardPanelOpen && "rotate-180",
                      )}
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Your accuracy:
                      </span>
                      <span className="font-semibold">
                        {Math.round(boardRelevance.accuracy)}% (
                        {boardRelevance.correctCount}/
                        {boardRelevance.questionsAttempted})
                      </span>
                    </div>
                    {boardRelevance.missedConcepts.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">
                          Common exam traps:
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {boardRelevance.missedConcepts
                            .slice(0, 3)
                            .map((mc) => (
                              <Badge
                                key={mc.concept}
                                variant="outline"
                                className="text-xs bg-notebook-trap/10 text-notebook-trap border-notebook-trap/30"
                              >
                                {mc.concept}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

          {/* Topic Header */}
          <TopicHeader
            title={topic.canonicalName}
            aliases={topic.aliases}
            cardCount={totalCards}
            sourceCount={blocks.length}
            lastUpdated={page.updatedAt}
          />

          {/* Article Content */}
          {blocks.length === 0 && viewMode === "highYield" ? (
            <div className="text-center py-16 text-muted-foreground">
              <Star className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium mb-2">
                No high-yield blocks yet
              </p>
              <p className="text-sm">
                Click the star icon on any block to mark it as high-yield
              </p>
            </div>
          ) : (
            <ArticleContent
              blocks={blocks}
              onFootnoteClick={handleFootnoteClick}
              onBlockEdit={handleBlockEdit}
              onStarToggle={handleStarToggle}
              togglingBlockIds={togglingBlockIds}
            />
          )}

          {/* Source Footnotes */}
          <SourceFootnotes
            footnotes={footnotes}
            onViewSource={handleViewSource}
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="flex-shrink-0 p-4 border-t border-border/30 bg-notebook-card flex justify-between items-center px-6">
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            className="gap-2"
            onClick={() => setAddBlockOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Add from Library
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setDirectAuthorOpen(true)}
          >
            <PenLine className="w-4 h-4" />
            Write Note
          </Button>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          disabled={blocks.length === 0}
          onClick={() => setCardGenOpen(true)}
        >
          <Sparkles className="w-4 h-4" />
          Generate Cards
        </Button>
      </footer>

      {/* Modals */}
      <AddBlockModal
        open={addBlockOpen}
        onOpenChange={setAddBlockOpen}
        notebookTopicPageId={pageId}
        onSuccess={fetchData}
      />

      {selectedSourceId && (
        <SourcePreviewPanel
          sourceItemId={selectedSourceId}
          onClose={() => setSelectedSourceId(null)}
        />
      )}

      <BlockEditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        block={editingBlock}
        topicName={topic?.canonicalName || ""}
        onSave={handleBlockSave}
        displayField="userInsight"
      />

      <TopicCardGeneration
        open={cardGenOpen}
        onOpenChange={setCardGenOpen}
        topicName={topic?.canonicalName || ""}
        topicPageId={pageId}
        blocks={blocks}
        onCardsCreated={fetchData}
      />

      <DirectAuthorModal
        open={directAuthorOpen}
        onOpenChange={setDirectAuthorOpen}
        topicName={topic?.canonicalName || ""}
        pageId={pageId}
        onSave={() => {
          fetchData();
        }}
      />
    </div>
  );
}
