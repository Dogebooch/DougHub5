import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  RotateCcw,
  XCircle,
  AlertTriangle,
  Circle,
  CheckCircle2,
} from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import { Button } from "@/components/ui/button";
import { Rating } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { ClozeDisplay, ClozeAnswer } from "@/lib/cloze-renderer";

const CONTINUE_LOCKOUT_MS = 400; // Prevent accidental double-taps

export function ReviewInterface() {
  const { cards, notes, isHydrated, setCurrentView, scheduleCardReview } =
    useAppStore();
  const { toast } = useToast();

  const isMounted = useRef(true);

  // Session queue: card IDs in review order
  const [reviewQueue, setReviewQueue] = useState<string[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  // Task 5.6: Feedback state
  const [showingFeedback, setShowingFeedback] = useState(false);
  const [currentGrade, setCurrentGrade] = useState<number | null>(null);

  // Redirect timeout for session completion
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Time tracking for response time and timeout (Task 5.2)
  const [responseStartTime, setResponseStartTime] = useState<number | null>(
    null
  );
  const [isPaused, setIsPaused] = useState(false);
  const [showManualGradeSelector, setShowManualGradeSelector] = useState(false);

  // Track mount status and cleanup timeouts
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  // Initialize session queue with due cards
  const initialDueCards = useMemo(() => {
    const now = new Date();
    return cards.filter((card) => {
      const cardDue = new Date(card.dueDate);
      return cardDue <= now;
    });
  }, [cards]);

  // Initialize queue on mount or when cards change
  useEffect(() => {
    if (reviewQueue.length === 0 && initialDueCards.length > 0) {
      setReviewQueue(initialDueCards.map((c) => c.id));
    }
  }, [initialDueCards, reviewQueue.length]);

  // Get current card from queue
  const currentCardId = reviewQueue[currentQueueIndex];
  const currentCard = cards.find((c) => c.id === currentCardId);

  const totalInQueue = reviewQueue.length;
  const progressPercent =
    totalInQueue > 0
      ? Math.round(((currentQueueIndex + 1) / totalInQueue) * 100)
      : 0;

  const currentNote = currentCard
    ? notes.find((note) => note.id === currentCard.noteId)
    : null;

  const [topicInfo, setTopicInfo] = useState<{
    name: string;
    count: number;
  } | null>(null);

  // Fetch specialized topic metadata (v2)
  useEffect(() => {
    let active = true;
    if (currentCard?.notebookTopicPageId) {
      window.api.cards
        .getTopicMetadata(currentCard.notebookTopicPageId)
        .then((res) => {
          if (active && res.data) {
            setTopicInfo(res.data);
          } else if (active) {
            setTopicInfo(null);
          }
        })
        .catch(() => {
          if (active) setTopicInfo(null);
        });
    } else {
      setTopicInfo(null);
    }
    return () => {
      active = false;
    };
  }, [currentCard?.notebookTopicPageId]);

  // Timeout detection for interrupted sessions (60 seconds)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (answerVisible && responseStartTime && !isPaused) {
      timeoutId = setTimeout(() => {
        setIsPaused(true);
      }, 60000);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [answerVisible, responseStartTime, isPaused]);

  const handleShowAnswer = useCallback(() => {
    setAnswerVisible(true);
    setResponseStartTime(Date.now());
  }, []);

  const navigateToCapture = useCallback(() => {
    setCurrentView("capture");
  }, [setCurrentView]);

  const calculateAutoRating = useCallback((responseTimeMs: number) => {
    if (responseTimeMs < 5000) return Rating.Easy;
    if (responseTimeMs < 15000) return Rating.Good;
    if (responseTimeMs < 30000) return Rating.Hard;
    return Rating.Again;
  }, []);

  const submitReview = useCallback(
    async (
      rating: (typeof Rating)[keyof typeof Rating],
      responseTimeMs?: number | null
    ): Promise<boolean> => {
      if (!currentCard || isSubmitting) return false;

      setIsSubmitting(true);
      try {
        const result = await scheduleCardReview(
          currentCard.id,
          rating,
          responseTimeMs
        );

        if (!result.success) {
          toast({
            title: "Review Failed",
            description: result.error || "Failed to save review",
            variant: "destructive",
          });
          if (isMounted.current) setIsSubmitting(false);
          return false;
        }

        if (isMounted.current) {
          setReviewedCount((prev) => prev + 1);

          // Handle learning cards: if rated Again, re-add to end of queue
          if (rating === Rating.Again && result.data) {
            // Card rated Again - add back to queue for re-review this session
            setReviewQueue((prev) => [...prev, currentCard.id]);
          }

          // Move to next card
          if (currentQueueIndex < totalInQueue - 1) {
            setCurrentQueueIndex((prev) => prev + 1);
            setAnswerVisible(false);
          } else {
            // Check if there are more cards added to queue (from Again ratings)
            if (reviewQueue.length > currentQueueIndex + 1) {
              setCurrentQueueIndex((prev) => prev + 1);
              setAnswerVisible(false);
            } else {
              setSessionComplete(true);
              redirectTimeoutRef.current = setTimeout(() => {
                if (isMounted.current) setCurrentView("capture");
              }, 2000);
            }
          }
        }
        return true;
      } catch (error) {
        console.error("[Review] Error submitting review:", error);
        toast({
          title: "Review Failed",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
        return false;
      } finally {
        if (isMounted.current) setIsSubmitting(false);
      }
    },
    [
      currentCard,
      currentQueueIndex,
      totalInQueue,
      reviewQueue.length,
      isSubmitting,
      scheduleCardReview,
      setCurrentView,
      toast,
    ]
  );

  const executeRating = useCallback(
    async (rating: number, responseTimeMs: number | null = null) => {
      if (isSubmitting || showingFeedback) return;

      setCurrentGrade(rating);
      setShowingFeedback(true);

      setTimeout(async () => {
        const success = await submitReview(rating as any, responseTimeMs);

        if (isMounted.current) {
          setShowingFeedback(false);
          setCurrentGrade(null);
          if (success) {
            setResponseStartTime(null);
            setIsPaused(false);
            setShowManualGradeSelector(false);
          }
        }
      }, 1000);
    },
    [isSubmitting, showingFeedback, submitReview]
  );

  const handleContinue = useCallback(async () => {
    if (!responseStartTime || isSubmitting || showingFeedback) return;

    const rawResponseTimeMs = Date.now() - responseStartTime;

    // Prevent accidental double-taps/skipping answer
    if (rawResponseTimeMs < CONTINUE_LOCKOUT_MS) return;

    if (isPaused) {
      setShowManualGradeSelector(true);
      return;
    }

    const responseTimeMs = rawResponseTimeMs;
    const rating = calculateAutoRating(responseTimeMs);

    await executeRating(rating, responseTimeMs);
  }, [
    responseStartTime,
    isPaused,
    isSubmitting,
    showingFeedback,
    calculateAutoRating,
    executeRating,
  ]);

  const handleManualGrade = useCallback(
    async (rating: (typeof Rating)[keyof typeof Rating]) => {
      if (isSubmitting || showingFeedback) return;
      await executeRating(rating, null);
    },
    [executeRating, isSubmitting, showingFeedback]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === " ") {
        e.preventDefault();
        if (showingFeedback) return;
        if (!answerVisible) {
          handleShowAnswer();
        } else if (!isSubmitting) {
          handleContinue();
        }
      } else if (answerVisible && !isSubmitting && !showingFeedback) {
        if (e.key === "1") handleManualGrade(Rating.Again);
        else if (e.key === "2") handleManualGrade(Rating.Hard);
        else if (e.key === "3") handleManualGrade(Rating.Good);
        else if (e.key === "4") handleManualGrade(Rating.Easy);
        else if (e.key === "Enter") handleContinue();
      } else if (e.key === "Escape") {
        navigateToCapture();
      } else if (
        e.key.toLowerCase() === "s" &&
        currentCard?.notebookTopicPageId
      ) {
        setCurrentView("notebook", currentCard.notebookTopicPageId);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [
    answerVisible,
    handleShowAnswer,
    handleContinue,
    handleManualGrade,
    navigateToCapture,
    isSubmitting,
    showingFeedback,
    showManualGradeSelector,
    isPaused,
    currentCard,
    setCurrentView,
  ]);

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-pulse text-lg text-muted-foreground">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (initialDueCards.length === 0 && reviewQueue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-semibold text-foreground">
            All caught up!
          </h1>
          <p className="text-muted-foreground">
            No cards are due for review right now.
          </p>
        </div>
        <button
          onClick={navigateToCapture}
          className="text-primary hover:underline flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Capture
        </button>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-semibold text-foreground">
            Session complete!
          </h1>
          <p className="text-muted-foreground">
            Reviewed {reviewedCount} card{reviewedCount !== 1 ? "s" : ""}.
            Redirecting to Capture page...
          </p>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-pulse text-lg text-muted-foreground">
            Loading card...
          </div>
        </div>
      </div>
    );
  }

  const isHighDifficulty = currentCard.difficulty > 8.0;
  const isUrgentDifficulty = currentCard.difficulty > 9.0;

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-6 animate-in fade-in duration-500">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/50">
          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
            {progressPercent}%
          </span>
          <span className="flex items-center gap-1.5">
            <RotateCcw className="h-3 w-3" />
            {reviewedCount} done
          </span>
        </div>
        <div className="w-full h-1 bg-black/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Card display */}
      <div
        className={cn(
          "bg-card border border-border/60 rounded-2xl p-8 space-y-6 shadow-lg relative overflow-hidden min-h-[320px] flex flex-col justify-center transition-all duration-300 hover:shadow-xl text-card-foreground",
          isUrgentDifficulty
            ? "ring-2 ring-destructive/50"
            : isHighDifficulty
            ? "ring-2 ring-amber-500/40"
            : "",
          isHighDifficulty &&
            answerVisible &&
            "motion-safe:animate-pulse-subtle"
        )}
      >
        {/* Subtle accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        <div className="text-center space-y-6">
          {/* Front - Use cloze renderer for cloze and list-cloze types */}
          {currentCard.cardType === "cloze" ||
          currentCard.cardType === "list-cloze" ? (
            <div className="text-2xl font-serif leading-relaxed tracking-tight text-card-foreground/95">
              <ClozeDisplay
                front={currentCard.front}
                revealed={answerVisible}
                cardId={currentCard.id}
                cardType={currentCard.cardType}
              />
            </div>
          ) : (
            <div className="text-3xl font-serif font-medium leading-snug tracking-tight text-card-foreground">
              {currentCard.front}
            </div>
          )}

          {answerVisible && (
            <div className="pt-6 border-t border-black/5 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
              {/* Back - Use cloze answer for cloze types */}
              {currentCard.cardType === "cloze" ||
              currentCard.cardType === "list-cloze" ? (
                <div className="font-serif italic text-xl text-card-muted/90">
                  <ClozeAnswer back={currentCard.back} />
                </div>
              ) : (
                <div className="text-xl leading-relaxed text-card-muted/90 font-serif italic">
                  {currentCard.back}
                </div>
              )}
            </div>
          )}
        </div>

        {/* High Difficulty Warning */}
        {isHighDifficulty && (
          <div className="flex flex-col items-center gap-2 py-4 animate-in fade-in zoom-in-95 duration-500">
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider",
                isUrgentDifficulty
                  ? "bg-destructive/10 text-destructive border border-destructive/20"
                  : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
              )}
            >
              <AlertTriangle className="h-3 w-3" />
              {isUrgentDifficulty
                ? "This card needs attention"
                : "This card is challenging"}
            </div>
            {currentCard.notebookTopicPageId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px] text-muted-foreground hover:text-primary"
                onClick={() =>
                  setCurrentView("notebook", currentCard.notebookTopicPageId)
                }
              >
                View in Notebook
              </Button>
            )}
          </div>
        )}

        <div className="text-center text-[10px] text-card-muted/70 pt-6 border-t border-black/5 font-medium uppercase tracking-widest">
          <span className="opacity-50">From:</span>{" "}
          {currentCard.notebookTopicPageId ? (
            <button
              onClick={() =>
                currentCard.notebookTopicPageId &&
                setCurrentView("notebook", currentCard.notebookTopicPageId)
              }
              className="text-card-foreground/70 hover:text-primary transition-colors cursor-pointer group relative underline decoration-dotted underline-offset-4"
              title="View source → (S)"
            >
              {topicInfo ? (
                <>
                  {topicInfo.name ||
                    currentCard.notebookTopicPageId.slice(0, 8)}{" "}
                  <span className="opacity-50 font-normal normal-case ml-1">
                    ({topicInfo.count} cards)
                  </span>
                </>
              ) : (
                "Source unavailable"
              )}
            </button>
          ) : (
            <span className="text-card-foreground/70">
              {currentNote ? currentNote.title : "Unknown"}
            </span>
          )}
          {currentCard.state > 0 && (
            <span className="ml-3 opacity-40 text-[9px]">
              • S:{currentCard.stability.toFixed(1)} • D:
              {currentCard.difficulty.toFixed(1)} • R:{currentCard.reps}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-center min-h-[140px] items-center">
        {showingFeedback ? (
          <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
            {currentGrade === Rating.Again && (
              <>
                <XCircle className="h-10 w-10 text-destructive/80" />
                <span className="text-sm font-semibold text-destructive/80 uppercase tracking-widest">
                  Forgot
                </span>
              </>
            )}
            {currentGrade === Rating.Hard && (
              <>
                <AlertTriangle className="h-10 w-10 text-accent/80" />
                <span className="text-sm font-semibold text-accent/80 uppercase tracking-widest">
                  Struggled
                </span>
              </>
            )}
            {currentGrade === Rating.Good && (
              <>
                <Circle className="h-10 w-10 text-info/80" />
                <span className="text-sm font-semibold text-info/80 uppercase tracking-widest">
                  Recalled
                </span>
              </>
            )}
            {currentGrade === Rating.Easy && (
              <>
                <CheckCircle2 className="h-10 w-10 text-success/80" />
                <span className="text-sm font-semibold text-success/80 uppercase tracking-widest">
                  Mastered
                </span>
              </>
            )}
          </div>
        ) : !answerVisible ? (
          <Button
            size="lg"
            onClick={handleShowAnswer}
            className="min-w-[220px] h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg hover:shadow-xl hover:translate-y-[-1px] transition-all duration-200"
          >
            Show Answer
            <span className="ml-3 text-[10px] opacity-50 font-mono">Space</span>
          </Button>
        ) : (
          <div className="flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
            {!isPaused && (
              <Button
                size="lg"
                onClick={handleContinue}
                disabled={isSubmitting}
                className="min-w-[220px] h-12 text-base font-semibold bg-white/5 hover:bg-white/10 text-foreground border border-white/10 rounded-xl shadow-md hover:shadow-lg hover:translate-y-[-1px] transition-all duration-200"
              >
                Continue
                <span className="ml-3 text-[10px] opacity-40 font-mono">
                  Space
                </span>
              </Button>
            )}

            {isPaused && (
              <div className="text-center space-y-1 py-2">
                <p className="text-base font-serif italic text-foreground/80">
                  Stepped away?
                </p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
                  Select recall quality
                </p>
              </div>
            )}

            {showManualGradeSelector && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  variant="destructive"
                  onClick={() => handleManualGrade(Rating.Again)}
                  disabled={isSubmitting}
                  className="min-w-[100px] h-12 shadow-md hover:shadow-lg hover:translate-y-[-1px] transition-all bg-[#8c3a2e] hover:bg-[#a64536] border-none rounded-xl flex flex-col items-center justify-center gap-0.5 active:scale-95"
                >
                  <span className="text-[9px] uppercase tracking-wider font-semibold opacity-60">
                    Forgot
                  </span>
                  <span className="font-serif font-bold text-base italic">
                    1
                  </span>
                </Button>
                <Button
                  onClick={() => handleManualGrade(Rating.Hard)}
                  disabled={isSubmitting}
                  className="min-w-[100px] h-12 shadow-md hover:shadow-lg hover:translate-y-[-1px] transition-all bg-[#b58135] hover:bg-[#cf943c] text-white border-none rounded-xl flex flex-col items-center justify-center gap-0.5 active:scale-95"
                >
                  <span className="text-[9px] uppercase tracking-wider font-semibold opacity-60">
                    Struggled
                  </span>
                  <span className="font-serif font-bold text-base italic">
                    2
                  </span>
                </Button>
                <Button
                  onClick={() => handleManualGrade(Rating.Good)}
                  disabled={isSubmitting}
                  className="min-w-[100px] h-12 shadow-md hover:shadow-lg hover:translate-y-[-1px] transition-all bg-[#3d5e7a] hover:bg-[#4a7294] text-white border-none rounded-xl flex flex-col items-center justify-center gap-0.5 active:scale-95"
                >
                  <span className="text-[9px] uppercase tracking-wider font-semibold opacity-60">
                    Recalled
                  </span>
                  <span className="font-serif font-bold text-base italic">
                    3
                  </span>
                </Button>
                <Button
                  onClick={() => handleManualGrade(Rating.Easy)}
                  disabled={isSubmitting}
                  className="min-w-[100px] h-12 shadow-md hover:shadow-lg hover:translate-y-[-1px] transition-all bg-[#3e5e40] hover:bg-[#4b724e] text-white border-none rounded-xl flex flex-col items-center justify-center gap-0.5 active:scale-95"
                >
                  <span className="text-[9px] uppercase tracking-wider font-semibold opacity-60">
                    Mastered
                  </span>
                  <span className="font-serif font-bold text-base italic">
                    4
                  </span>
                </Button>
              </div>
            )}
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/40">
              Keys 1-4
            </p>
          </div>
        )}
      </div>

      {/* Back navigation */}
      <div className="text-center pt-4">
        <button
          onClick={navigateToCapture}
          className="text-sm text-muted-foreground/60 hover:text-foreground transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Capture
        </button>
      </div>
    </div>
  );
}
