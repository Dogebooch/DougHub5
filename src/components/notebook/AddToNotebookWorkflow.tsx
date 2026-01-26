import { useState, useCallback, useEffect } from "react";
import { Loader2, Sparkles, Check, X, WifiOff } from "lucide-react";
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

/** Result from AI concept identification */
interface TestedConceptResult {
  concept: string;
  confidence: "high" | "medium" | "low";
  usedFallback?: boolean;
}

/** Result from AI insight polish */
interface PolishInsightResult {
  polished: string;
  fromUser: string[];
  addedContext: string[];
  usedFallback?: boolean;
}

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

  // T138: AI-assisted insight extraction
  const [testedConcept, setTestedConcept] =
    useState<TestedConceptResult | null>(null);
  const [isIdentifyingConcept, setIsIdentifyingConcept] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishResult, setPolishResult] = useState<PolishInsightResult | null>(
    null,
  );

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
        // T138 state
        setTestedConcept(null);
        setPolishResult(null);
      }, 300); // Allow dialog exit animation
    }
  }, [open]);

  // T138.4: Auto-identify tested concept when modal opens
  useEffect(() => {
    if (!open || !sourceItem) return;

    const identifyConcept = async () => {
      setIsIdentifyingConcept(true);
      try {
        const result = await window.api.ai.identifyTestedConcept(
          sourceItem.rawContent,
          sourceItem.sourceType,
        );
        if (result.data) {
          setTestedConcept(result.data);
        }
      } catch (error) {
        console.error("Concept identification failed:", error);
        // Silent failure - don't block the user
      } finally {
        setIsIdentifyingConcept(false);
      }
    };

    identifyConcept();
  }, [open, sourceItem?.id]); // Re-run when sourceItem changes

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

  // T138.5: Handle polish insight
  const handlePolishInsight = async () => {
    if (!sourceItem || !isInsightValid) return;

    setIsPolishing(true);
    try {
      const result = await window.api.ai.polishInsight(
        insight,
        sourceItem.rawContent,
        testedConcept?.concept,
      );

      if (result.data && result.data.polished) {
        setPolishResult(result.data);
      }
    } catch (error) {
      console.error("Polish insight failed:", error);
      toast({
        title: "Polish Unavailable",
        description: "Could not polish your insight. Your original is fine!",
        variant: "destructive",
      });
    } finally {
      setIsPolishing(false);
    }
  };

  // T138.6: Accept polished insight
  const handleAcceptPolish = () => {
    if (polishResult?.polished) {
      setInsight(polishResult.polished);
      setPolishResult(null); // Clear the panel
    }
  };

  // T138.6: Reject polished insight (keep original)
  const handleRejectPolish = () => {
    setPolishResult(null);
  };

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
        isHighYield: false, // Default to not high-yield
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

              {/* T138.4: Concept hint from AI */}
              {(isIdentifyingConcept || testedConcept) && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    {isIdentifyingConcept ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-muted-foreground">
                          Identifying what this tests...
                        </span>
                      </>
                    ) : testedConcept ? (
                      <>
                        <span className="text-muted-foreground">
                          This tests:
                        </span>
                        <span className="font-medium text-primary">
                          {testedConcept.concept}
                        </span>
                        {testedConcept.usedFallback ? (
                          <span
                            className="text-muted-foreground/60"
                            title="AI unavailable - using default prompt"
                          >
                            <WifiOff className="h-3 w-3" />
                          </span>
                        ) : testedConcept.confidence === "high" ? (
                          <Badge
                            variant="secondary"
                            className="text-xs px-1.5 py-0"
                          >
                            High confidence
                          </Badge>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <InsightTextarea
                  value={insight}
                  onChange={(val) => {
                    setInsight(val);
                    // Clear polish result when user edits
                    if (polishResult) setPolishResult(null);
                  }}
                  onValidChange={setIsInsightValid}
                />

                {/* T138.5: Polish button */}
                {isInsightValid && !polishResult && (
                  <div className="flex justify-end mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePolishInsight}
                      disabled={isPolishing}
                      className="text-xs text-muted-foreground hover:text-primary"
                    >
                      {isPolishing ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Polishing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 mr-1" />
                          Polish with AI
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* T138.6: Polish result panel with attribution */}
              {polishResult && (
                <div className="rounded-lg border border-primary/50 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      {polishResult.usedFallback ? (
                        <>
                          Original Kept
                          <span
                            className="text-muted-foreground/60"
                            title="AI unavailable - showing your original"
                          >
                            <WifiOff className="h-3 w-3" />
                          </span>
                        </>
                      ) : (
                        "Polished Version"
                      )}
                    </h4>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRejectPolish}
                        className="h-7 px-2 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Keep Original
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleAcceptPolish}
                        className="h-7 px-2 text-xs"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Use This
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm bg-background/50 rounded p-2 border">
                    {polishResult.polished}
                  </p>

                  {/* Attribution: what came from user vs AI */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {polishResult.fromUser.length > 0 && (
                      <div>
                        <p className="font-medium text-muted-foreground mb-1">
                          From you:
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground/80">
                          {polishResult.fromUser.slice(0, 3).map((item, i) => (
                            <li key={i} className="truncate">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {polishResult.addedContext.length > 0 && (
                      <div>
                        <p className="font-medium text-muted-foreground mb-1">
                          AI added:
                        </p>
                        <ul className="list-disc list-inside text-muted-foreground/80">
                          {polishResult.addedContext
                            .slice(0, 3)
                            .map((item, i) => (
                              <li key={i} className="truncate">
                                {item}
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
              onClick={handleGetAIFeedback}
              disabled={!isInsightValid || isGettingFeedback || isSaving || !!aiFeedback}
              className="min-w-[140px]"
            >
              {isGettingFeedback ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Checking...
                </>
              ) : aiFeedback ? (
                <>
                  <span className="mr-2">✓</span>
                  Feedback Ready
                </>
              ) : (
                "Get Feedback"
              )}
            </Button>

            <Button
              onClick={handleSaveToNotebook}
              disabled={!selectedTopic || !isInsightValid || isSaving}
              className="min-w-[160px]"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "📓 Save to Notebook"
              )}
            </Button>
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
