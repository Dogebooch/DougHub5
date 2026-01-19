import { useState, useCallback, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  SourceItem,
  CanonicalTopic,
  RelevanceScore,
  NotebookBlockAiEvaluation,
} from "@/types";
import { SourcePreviewPanel } from "./SourcePreviewPanel";
import { TopicSelector } from "./TopicSelector";
import { BoardRelevancePanel } from "./BoardRelevancePanel";
import { InsightTextarea } from "./InsightTextarea";
import { Badge } from "@/components/ui/badge";
import { ExistingBlocksList } from "./ExistingBlocksList";

interface AddToNotebookWorkflowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceItem: SourceItem | null;
  onSuccess?: () => void;
}

export function AddToNotebookWorkflow({
  open,
  onOpenChange,
  sourceItem,
  onSuccess,
}: AddToNotebookWorkflowProps) {
  const [selectedTopic, setSelectedTopic] = useState<CanonicalTopic | null>(
    null,
  );
  const [insight, setInsight] = useState("");
  const [isInsightValid, setIsInsightValid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    show: boolean;
    existingBlockId?: string;
  } | null>(null);

  const [relevanceScore, setRelevanceScore] =
    useState<RelevanceScore>("unknown");
  const [relevanceReason, setRelevanceReason] = useState("");
  const [isGettingFeedback, setIsGettingFeedback] = useState(false);
  const [aiFeedback, setAiFeedback] =
    useState<NotebookBlockAiEvaluation | null>(null);

  const { toast } = useToast();

  // Reset state when source item changes or dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setSelectedTopic(null);
        setInsight("");
        setIsInsightValid(false);
        setDuplicateWarning(null);
        setAiFeedback(null);
        setRelevanceScore("unknown");
        setRelevanceReason("");
      }, 300); // Allow dialog exit animation
    }
  }, [open]);

  const handleGetAIFeedback = async () => {
    if (!sourceItem || !isInsightValid) return;

    setIsGettingFeedback(true);
    try {
      const result = await window.api.ai.evaluateInsight({
        userInsight: insight,
        sourceContent: sourceItem.rawContent,
        isIncorrect: sourceItem.correctness === "incorrect",
        topicContext: selectedTopic?.canonicalName,
      });

      if (result.data) {
        setAiFeedback(result.data);
      }
    } catch (error) {
      console.error("AI feedback failed:", error);
      toast({
        title: "AI Feedback Unavailable",
        description:
          "Could not get AI feedback. You can still save your insight.",
        variant: "destructive",
      });
    } finally {
      setIsGettingFeedback(false);
    }
  };

  const handleRelevanceComputed = useCallback(
    (score: RelevanceScore, reason: string) => {
      setRelevanceScore(score);
      setRelevanceReason(reason);
    },
    [],
  );

  // Handle Create Notebook Entry
  const createNotebookEntry = async () => {
    if (!sourceItem || !selectedTopic) return;

    setIsSaving(true);
    try {
      // 1. Get or create notebook page for topic
      const pagesResult = await window.api.notebookPages.getAll();
      let page = pagesResult.data?.find(
        (p) => p.canonicalTopicId === selectedTopic.id,
      );

      if (!page) {
        const newPageResult = await window.api.notebookPages.create({
          id: crypto.randomUUID(),
          canonicalTopicId: selectedTopic.id,
          cardIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        if (!newPageResult.data)
          throw new Error(newPageResult.error || "Failed to create page");
        page = newPageResult.data;
      }

      // 2. Get next position
      const blocksResult = await window.api.notebookBlocks.getByPage(page.id);
      const nextPosition = blocksResult.data?.length || 0;

      // 3. Create notebook block
      const blockResult = await window.api.notebookBlocks.create({
        id: crypto.randomUUID(),
        notebookTopicPageId: page.id,
        sourceItemId: sourceItem.id,
        content: insight,
        userInsight: insight,
        aiEvaluation: aiFeedback || undefined,
        relevanceScore: relevanceScore,
        relevanceReason: relevanceReason,
        position: nextPosition,
        cardCount: 0,
      });
      if (!blockResult.data)
        throw new Error(blockResult.error || "Failed to create block");

      // 4. Update source status to 'curated'
      await window.api.sourceItems.update(sourceItem.id, { status: "curated" });

      toast({
        title: "Added to Notebook",
        description: `Your insight has been saved to "${selectedTopic.canonicalName}"`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save to notebook:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveToNotebook = async () => {
    if (!selectedTopic || !isInsightValid || !sourceItem) return;
    setIsSaving(true);

    try {
      // Check for duplicate: Does this source already have a block in this topic?
      const existingBlock = await window.api.notebookBlocks.getBySourceId(
        sourceItem.id,
      );

      if (existingBlock.data) {
        // Find the page for this block to check if it's the same topic
        const pagesResult = await window.api.notebookPages.getAll();
        const existingPage = pagesResult.data?.find(
          (p) => p.id === existingBlock.data!.notebookTopicPageId,
        );

        if (existingPage?.canonicalTopicId === selectedTopic.id) {
          // Same topic - show duplicate warning
          setDuplicateWarning({
            show: true,
            existingBlockId: existingBlock.data.id,
          });
          setIsSaving(false);
          return;
        }
      }

      await createNotebookEntry();
    } catch (error) {
      console.error("Duplicate check failed:", error);
      // Proceed anyway if check fails, or show error? Let's proceed to createNotebookEntry
      // but log it.
      await createNotebookEntry();
    }
  };

  const handleSaveDraft = async () => {
    if (!sourceItem) return;
    setIsSaving(true);
    try {
      // Just mark source as processed (reviewed but not yet added to notebook)
      await window.api.sourceItems.update(sourceItem.id, {
        status: "processed",
      });
      toast({
        title: "Draft Saved",
        description:
          "Item marked as reviewed. You can add it to your notebook later.",
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!sourceItem) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>ADD TO NOTEBOOK</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            <SourcePreviewPanel sourceItem={sourceItem} />

            <div className="space-y-4">
              <TopicSelector
                selectedTopic={selectedTopic}
                onTopicSelect={setSelectedTopic}
                suggestedTopicName={sourceItem.metadata?.subject}
              />

              {selectedTopic && (
                <BoardRelevancePanel
                  topicId={selectedTopic.id}
                  topicTags={
                    selectedTopic.aliases || [selectedTopic.canonicalName]
                  }
                  sourceContent={sourceItem.rawContent}
                  onRelevanceComputed={handleRelevanceComputed}
                />
              )}

              <div className="pt-2">
                <InsightTextarea
                  value={insight}
                  onChange={setInsight}
                  onValidChange={setIsInsightValid}
                />
              </div>

              {aiFeedback && (
                <div className="rounded-lg border bg-accent/20 p-4 space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    💡 AI Feedback
                  </h4>
                  <p className="text-sm">{aiFeedback.feedbackText}</p>

                  {aiFeedback.gaps.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Gaps identified:
                      </p>
                      <ul className="text-sm list-disc list-inside text-muted-foreground">
                        {aiFeedback.gaps.map((gap, i) => (
                          <li key={i}>{gap}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiFeedback.examTrapType && (
                    <Badge variant="destructive" className="text-xs">
                      Exam Trap: {aiFeedback.examTrapType.replace(/-/g, " ")}
                    </Badge>
                  )}
                </div>
              )}

              {selectedTopic && (
                <div className="pt-2">
                  <ExistingBlocksList topicId={selectedTopic.id} />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-6 pt-2 border-t flex items-center justify-end gap-3 bg-surface-elevated/20">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSaving || isGettingFeedback}
              className="px-6"
            >
              Save Draft
            </Button>

            {!aiFeedback ? (
              <Button
                onClick={handleGetAIFeedback}
                disabled={!isInsightValid || isGettingFeedback || isSaving}
                className="px-6 min-w-[160px]"
              >
                {isGettingFeedback ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Getting
                    Feedback...
                  </>
                ) : (
                  "Get AI Feedback"
                )}
              </Button>
            ) : (
              <Button
                onClick={handleSaveToNotebook}
                disabled={!selectedTopic || !isInsightValid || isSaving}
                className="px-6 min-w-[160px]"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save to Notebook"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={duplicateWarning?.show}
        onOpenChange={(show) => !show && setDuplicateWarning(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block Already Exists</AlertDialogTitle>
            <AlertDialogDescription>
              You already have an entry from this source in{" "}
              <span className="font-semibold">
                {selectedTopic?.canonicalName}
              </span>
              . Do you want to add another one?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDuplicateWarning(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDuplicateWarning(null);
                createNotebookEntry();
              }}
            >
              Add Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
