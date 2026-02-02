import React, { useCallback, useEffect, useState, useRef } from "react";
import { Loader2, BarChart3, ChevronDown } from "lucide-react";
import {
  NotebookTopicPage,
  NotebookBlock,
  CanonicalTopic,
  SourceItem,
} from "@/types";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

import { TopicEntryQuizPrompt, TopicQuizModal } from "../topic-quiz";
import { AddBlockModal } from "../AddBlockModal";
import { BlockEditModal } from "../BlockEditModal";
import { DirectAuthorModal } from "../DirectAuthorModal";
import { SourceItemViewerDialog } from "../../knowledgebank/SourceItemViewerDialog";
import { NotebookArticleLayout } from "../layout/NotebookArticleLayout";
import { NodeModeView } from "./NodeModeView";
import { ReaderModeView } from "./ReaderModeView";
import { TopicHeader } from "./TopicHeader";

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
  // onBack is handled by parent/layout
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

  // Layout State
  const [layoutMode, setLayoutMode] = useState<"reader" | "node">("reader");
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<NotebookBlock | null>(null);

  // Add Block State
  const [addBlockIndex, setAddBlockIndex] = useState<number | undefined>(
    undefined,
  );
  const [addBlockMode, setAddBlockMode] = useState<
    "library" | "manual" | "trap"
  >("library");

  // Direct author modal state
  const [directAuthorOpen, setDirectAuthorOpen] = useState(false);

  // Quiz state
  const [showEntryPrompt, setShowEntryPrompt] = useState(false);
  const [showEntryQuiz, setShowEntryQuiz] = useState(false);
  const [entryQuizDaysSince, setEntryQuizDaysSince] = useState(0);

  const fetchData = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    try {
      const pageResult = await window.api.notebookPages.getById(pageId);
      if (!pageResult) throw new Error("Notebook page not found");
      setPage(pageResult);

      const topicResult = await window.api.canonicalTopics.getById(
        pageResult.topicId,
      );
      setTopic(topicResult);

      const blocksResult = await window.api.notebookBlocks.getByPage(pageId);
      setBlocks(blocksResult);

      // Fetch source items
      const sourceIds = Array.from(
        new Set(blocksResult.map((b) => b.sourceItemId).filter(Boolean)),
      ) as string[];
      const itemsMap = new Map();
      for (const sId of sourceIds) {
        const item = await window.api.sourceItems.getById(sId);
        if (item) itemsMap.set(sId, item);
      }
      setSourceItems(itemsMap);

      // Board relevance
      if (topicResult) {
        const relevance = await window.api.insights.getBoardRelevance([
          topicResult.canonicalName,
          ...(topicResult.aliases || []),
        ]);
        setBoardRelevance(relevance);
      }

      // Quiz prompt logic
      const promptStatus = await window.api.topicQuiz.shouldPrompt(pageId);
      setShowEntryPrompt(promptStatus.shouldPrompt);
      setEntryQuizDaysSince(promptStatus.daysSince);
    } catch (err) {
      console.error("fetchData failed:", err);
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  // Handlers
  const handleAddBlock = (index?: number) => {
    setAddBlockIndex(index);
    setAddBlockMode("library");
    setAddBlockOpen(true);
  };

  const handleAddContrast = (blockId: string) => {
    const index = blocks.findIndex((b) => b.id === blockId);
    if (index !== -1) {
      setAddBlockIndex(index + 1);
      setAddBlockMode("trap");
      setAddBlockOpen(true);
    }
  };

  const handleAddFlashcard = (blockId: string) => {
    toast({
      title: "Flashcard Creator",
      description: `Creating flashcard for block ${blockId.substring(0, 8)}... (Phase 2 WIP)`,
    });
  };

  const handleBlockEdit = (block: NotebookBlock) => {
    setEditingBlock(block);
    setEditModalOpen(true);
  };

  const handleBlockSave = async (updates: Partial<NotebookBlock>) => {
    if (!editingBlock) return;
    try {
      await window.api.notebookBlocks.update(editingBlock.id, updates);
      toast({ title: "Updated", description: "Changes saved to the block." });
      fetchData();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update block.",
        variant: "destructive",
      });
    }
  };

  const handleViewSource = (sourceId: string) => {
    setSelectedSourceId(sourceId);
  };

  const handleEntryQuizStart = () => {
    setShowEntryPrompt(false);
    setShowEntryQuiz(true);
  };

  const handleEntryQuizSkip = () => {
    setShowEntryPrompt(false);
    window.api.topicQuiz.updateLastVisited(pageId);
  };

  const handleEntryQuizComplete = () => {
    setShowEntryQuiz(false);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
      </div>
    );
  }

  if (error || !page || !topic) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
        <p className="text-destructive font-medium">
          {error || "Failed to load topic"}
        </p>
        <Button onClick={() => fetchData()}>Retry</Button>
      </div>
    );
  }

  return (
    <NotebookArticleLayout
      viewMode={layoutMode}
      onViewModeChange={setLayoutMode}
      activeNodeId={activeNodeId}
      onNodeSelect={setActiveNodeId}
      title={topic.canonicalName}
      onAddFlashcard={handleAddFlashcard}
      onViewSource={handleViewSource}
    >
      {/* Render relevant view based on mode */}
      {layoutMode === "reader" ? (
        <div className="space-y-8">
          <TopicHeader
            title={topic.canonicalName}
            aliases={topic.aliases}
            cardCount={blocks.length} // Simplified for now
            sourceCount={sourceItems.size}
            lastUpdated={page.updatedAt}
          />

          <ReaderModeView
            blocks={blocks}
            sourceItems={sourceItems}
            archetype={topic.domain}
            topicTitle={topic.canonicalName}
            onNodeSelect={setActiveNodeId}
          />
        </div>
      ) : (
        <NodeModeView
          blocks={blocks}
          activeNodeId={activeNodeId}
          onNodeSelect={setActiveNodeId}
          archetype={topic.domain}
          onAddBlock={handleAddBlock}
          onAddContrast={handleAddContrast}
          onEditBlock={handleBlockEdit}
        />
      )}

      {/* Persistent Modals */}
      <AddBlockModal
        open={addBlockOpen}
        onOpenChange={setAddBlockOpen}
        notebookTopicPageId={pageId}
        onSuccess={fetchData}
        insertionIndex={addBlockIndex}
        defaultMode={addBlockMode}
      />
      <BlockEditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        block={editingBlock}
        topicName={topic.canonicalName}
        onSave={handleBlockSave}
        displayField="userInsight"
      />
      <DirectAuthorModal
        open={directAuthorOpen}
        onOpenChange={setDirectAuthorOpen}
        topicName={topic.canonicalName}
        pageId={pageId}
        onSave={fetchData}
      />

      {/* Board Relevance Panel */}
      <Collapsible
        open={boardPanelOpen}
        onOpenChange={setBoardPanelOpen}
        className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border bg-card p-4 shadow-lg"
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className="absolute -top-12 right-0 flex items-center gap-2 rounded-b-none rounded-t-lg border-b-0"
          >
            <BarChart3 className="h-4 w-4" />
            Board Relevance
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                boardPanelOpen ? "rotate-180" : "rotate-0",
              )}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {boardRelevance ? (
            <div className="space-y-2 text-sm pt-2">
              <h3 className="font-semibold">Board Relevance</h3>
              <p>
                Questions Attempted:{" "}
                <span className="font-medium">
                  {boardRelevance.questionsAttempted}
                </span>
              </p>
              <p>
                Correct:{" "}
                <span className="font-medium">
                  {boardRelevance.correctCount} (
                  {(boardRelevance.accuracy * 100).toFixed(1)}%)
                </span>
              </p>
              {boardRelevance.testedConcepts.length > 0 && (
                <div>
                  <p className="font-medium">Tested Concepts:</p>
                  <ul className="list-disc pl-5">
                    {boardRelevance.testedConcepts.map((c, i) => (
                      <li key={i}>
                        {c.concept} ({c.count})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {boardRelevance.missedConcepts.length > 0 && (
                <div>
                  <p className="font-medium">Missed Concepts:</p>
                  <ul className="list-disc pl-5">
                    {boardRelevance.missedConcepts.map((c, i) => (
                      <li key={i}>{c.concept}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground pt-2">
              No board relevance data available for this topic.
            </p>
          )}
        </CollapsibleContent>
      </Collapsible>

      {selectedSourceId && (
        <SourceItemViewerDialog
          open={!!selectedSourceId}
          item={sourceItems.get(selectedSourceId) || null}
          onClose={() => setSelectedSourceId(null)}
        />
      )}

      <TopicEntryQuizPrompt
        isOpen={showEntryPrompt}
        onClose={() => setShowEntryPrompt(false)}
        daysSince={entryQuizDaysSince}
        topicName={topic.canonicalName}
        onStartQuiz={handleEntryQuizStart}
        onSkip={handleEntryQuizSkip}
      />
      <TopicQuizModal
        isOpen={showEntryQuiz}
        onClose={() => setShowEntryQuiz(false)}
        topicPageId={pageId}
        topicName={topic.canonicalName}
        daysSince={entryQuizDaysSince}
        onComplete={handleEntryQuizComplete}
      />
    </NotebookArticleLayout>
  );
}
