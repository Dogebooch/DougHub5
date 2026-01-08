import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  Check,
  AlertCircle
} from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { ElaboratedFeedback } from "@/types/ai";
import { ClozeDisplay, ClozeAnswer } from "@/lib/cloze-renderer";

interface MistakesReviewModalProps {
  mistakes: { cardId: string; responseTimeMs: number | null }[];
  sessionStats?: {
    totalTimeMs: number;
    cardsReviewed: number;
    mistakeCount: number;
  };
  onClose: () => void;
}

const formatTime = (ms: number) => {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
};

/**
 * MistakesReviewModal
 *
 * A post-session review interface for cards rated "Again".
 * Provides AI-generated elaborated feedback to help medical residents
 * understand why they struggled and reinforce the core clinical concepts.
 */
export function MistakesReviewModal({
  mistakes,
  sessionStats,
  onClose,
}: MistakesReviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedbackCache, setFeedbackCache] = useState<
    Record<string, ElaboratedFeedback>
  >({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const cards = useAppStore((state) => state.cards);

  const currentMistake = mistakes[currentIndex];
  const currentCard = useMemo(
    () => cards.find((c) => c.id === currentMistake?.cardId),
    [cards, currentMistake]
  );

  const fetchFeedback = useCallback(
    async (index: number) => {
      const mistake = mistakes[index];
      if (!mistake) return;

      const card = cards.find((c) => c.id === mistake.cardId);
      if (!card) return;

      // Return if already cached or loading
      if (feedbackCache[card.id] || loadingIds.has(card.id)) return;

      setLoadingIds((prev) => new Set(prev).add(card.id));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[card.id];
        return next;
      });

      try {
        let topicContext = "General Medical Knowledge";
        if (card.notebookTopicPageId) {
          const topicResult = await window.api.cards.getTopicMetadata(
            card.notebookTopicPageId
          );
          if (topicResult.data) {
            topicContext = topicResult.data.name;
          }
        }

        const result = await window.api.ai.generateElaboratedFeedback(
          { front: card.front, back: card.back, cardType: card.cardType },
          topicContext,
          mistake.responseTimeMs
        );

        if (result.error) {
          throw new Error(result.error);
        }

        if (result.data) {
          setFeedbackCache((prev) => ({ ...prev, [card.id]: result.data! }));
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to generate AI feedback";
        console.error("Failed to generate elaborated feedback:", err);
        setErrors((prev) => ({ ...prev, [card.id]: errorMessage }));
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(card.id);
          return next;
        });
      }
    },
    [mistakes, cards, feedbackCache, loadingIds]
  );

  // Fetch feedback for current card whenever index changes
  useEffect(() => {
    if (mistakes.length > 0) {
      fetchFeedback(currentIndex);
    }
  }, [currentIndex, mistakes.length, fetchFeedback]);

  // Pre-fetch next card feedback for smoother experience
  useEffect(() => {
    if (currentIndex < mistakes.length - 1) {
      fetchFeedback(currentIndex + 1);
    }
  }, [currentIndex, mistakes.length, fetchFeedback]);

  const handleNext = useCallback(() => {
    if (currentIndex < mistakes.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, mistakes.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  if (mistakes.length === 0) return null;

  const currentFeedback = currentCard ? feedbackCache[currentCard.id] : null;
  const isLoading = currentCard ? loadingIds.has(currentCard.id) : false;
  const error = currentCard ? errors[currentCard.id] : null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] md:h-[80vh] flex flex-col p-0 overflow-hidden sm:rounded-xl">
        <DialogHeader className="p-6 pb-2 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">
              Mistake Review
            </DialogTitle>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded">
                {currentIndex + 1} of {mistakes.length}
              </span>
              {sessionStats && (
                <span className="text-xs text-muted-foreground">
                  Session: {formatTime(sessionStats.totalTimeMs)} •{" "}
                  {sessionStats.cardsReviewed - sessionStats.mistakeCount}/
                  {sessionStats.cardsReviewed} correct (
                  {Math.round(
                    ((sessionStats.cardsReviewed - sessionStats.mistakeCount) /
                      (sessionStats.cardsReviewed || 1)) *
                      100
                  )}
                  % accuracy)
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8 max-w-3xl mx-auto">
            {/* Card Content Section */}
            <div className="space-y-4">
              <div className="p-6 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Front
                </div>
                <div className="text-foreground">
                  <ClozeDisplay
                    front={currentCard?.front || ""}
                    revealed={true}
                    cardId={currentCard?.id}
                    cardType={currentCard?.cardType}
                  />
                </div>
              </div>

              <div className="p-6 rounded-xl border bg-muted/20">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Back
                </div>
                <div className="text-2xl font-medium text-foreground/90">
                  {currentCard?.cardType === "cloze" ||
                  currentCard?.cardType === "list-cloze" ? (
                    <ClozeAnswer back={currentCard?.back || ""} />
                  ) : (
                    currentCard?.back
                  )}
                </div>
              </div>
            </div>

            {/* AI Elaboration Section */}
            <div className="space-y-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  AI Context
                  {isLoading && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                </h3>
                {error && !isLoading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchFeedback(currentIndex)}
                    className="h-8 text-destructive hover:bg-destructive/10"
                  >
                    Retry Analysis
                  </Button>
                )}
              </div>

              {isLoading ? (
                <div className="space-y-6 animate-pulse">
                  <div className="space-y-2">
                    <div className="h-4 w-1/3 bg-muted rounded" />
                    <div className="h-16 bg-muted rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-1/4 bg-muted rounded" />
                    <div className="h-24 bg-muted rounded-lg" />
                  </div>
                </div>
              ) : error ? (
                <div className="p-6 rounded-lg bg-destructive/5 border border-destructive/20 text-destructive/80 flex items-start gap-4">
                  <AlertCircle className="h-6 w-6 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-destructive mb-1">
                      Feedback unavailable
                    </p>
                    <p className="text-sm leading-relaxed">{error}</p>
                  </div>
                </div>
              ) : currentFeedback ? (
                <div className="space-y-8 pb-4">
                  <section className="relative">
                    <h4 className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-3">
                      Conceptual Gap
                    </h4>
                    <p className="text-lg text-foreground/80 leading-relaxed italic border-l-4 border-warning/30 pl-6 py-1">
                      {currentFeedback.whyWrong}
                    </p>
                  </section>

                  <section>
                    <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-3">
                      Clinical Pearl
                    </h4>
                    <div className="p-6 rounded-xl bg-success/10 border border-success/30 text-foreground/90 leading-relaxed shadow-sm text-lg">
                      {currentFeedback.whyRight}
                    </div>
                  </section>

                  {currentFeedback.relatedConcepts.length > 0 && (
                    <section>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
                        Watch out for:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {currentFeedback.relatedConcepts.map((concept, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="px-3 py-1 bg-secondary/30 text-secondary-foreground hover:bg-secondary/50 border-none transition-colors"
                          >
                            {concept}
                          </Badge>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </ScrollArea>

        {/* Action Bar */}
        <div className="p-4 border-t bg-muted/10 shrink-0 flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              title="Previous (Left Arrow)"
              className="h-10 w-10 md:h-11 md:w-32 md:px-4"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="hidden md:inline ml-2">Previous</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              disabled={currentIndex === mistakes.length - 1}
              title="Next (Right Arrow)"
              className="h-10 w-10 md:h-11 md:w-32 md:px-4"
            >
              <span className="hidden md:inline mr-2">Next</span>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <Button
            onClick={onClose}
            className="min-w-[120px] h-11 px-8 font-bold text-base shadow-lg hover:shadow-xl transition-all"
          >
            {currentIndex === mistakes.length - 1 ? (
              <>
                <Check className="h-5 w-5 mr-2" />
                Finish Review
              </>
            ) : (
              "Done"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
