import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Progress bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Card {currentQueueIndex + 1} of {totalInQueue} - {progressPercent}%
            complete
          </span>
          <span className="flex items-center gap-1">
            <RotateCcw className="h-3 w-3" />
            {reviewedCount} reviewed
          </span>
        </div>
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_10px_rgba(20,184,166,0.3)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Card display */}
      <div className="bg-card border border-black/10 rounded-2xl p-12 space-y-8 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden">
        {/* Subtle accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="text-center space-y-8">
          {/* Front - Use cloze renderer for cloze and list-cloze types */}
          {currentCard.cardType === "cloze" ||
          currentCard.cardType === "list-cloze" ? (
            <ClozeDisplay
              front={currentCard.front}
              revealed={answerVisible}
              cardId={currentCard.id}
              cardType={currentCard.cardType}
            />
          ) : (
            <div className="text-3xl font-medium leading-relaxed tracking-tight text-card-foreground">
              {currentCard.front}
            </div>
          )}

          {answerVisible && (
            <div className="pt-10 border-t border-black/5 space-y-6">
              {/* Back - Use cloze answer for cloze types */}
              {currentCard.cardType === "cloze" ||
              currentCard.cardType === "list-cloze" ? (
                <ClozeAnswer back={currentCard.back} />
              ) : (
                <div className="text-2xl leading-relaxed text-card-foreground/90 font-medium">
                  {currentCard.back}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="text-center text-[11px] text-card-foreground/50 pt-8 border-t border-black/5">
          <span className="opacity-40 uppercase tracking-widest font-bold mr-2">
            Reference:
          </span>
          {currentNote ? currentNote.title : "Unknown source"}
          {currentCard.state > 0 && (
            <span className="ml-3 opacity-30">
              • Stability: {currentCard.stability.toFixed(1)} • Reps:{" "}
              {currentCard.reps}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-center min-h-[160px] items-center">
        {showingFeedback ? (
          <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-300">
            {currentGrade === Rating.Again && (
              <>
                <XCircle className="h-16 w-16 text-destructive opacity-80" />
                <span className="text-2xl font-bold text-destructive tracking-tight">
                  Forgot
                </span>
              </>
            )}
            {currentGrade === Rating.Hard && (
              <>
                <AlertTriangle className="h-16 w-16 text-orange-400 opacity-80" />
                <span className="text-2xl font-bold text-orange-400 tracking-tight">
                  Struggled
                </span>
              </>
            )}
            {currentGrade === Rating.Good && (
              <>
                <Circle className="h-16 w-16 text-blue-400 opacity-80" />
                <span className="text-2xl font-bold text-blue-400 tracking-tight">
                  Recalled
                </span>
              </>
            )}
            {currentGrade === Rating.Easy && (
              <>
                <CheckCircle2 className="h-16 w-16 text-emerald-400 opacity-80" />
                <span className="text-2xl font-bold text-emerald-400 tracking-tight">
                  Mastered
                </span>
              </>
            )}
          </div>
        ) : !answerVisible ? (
          <Button
            size="lg"
            onClick={handleShowAnswer}
            className="min-w-[280px] h-16 text-xl font-bold bg-primary hover:bg-primary/90 shadow-xl"
          >
            Show Answer
            <span className="ml-3 text-sm opacity-70 font-normal">(Space)</span>
          </Button>
        ) : (
          <div className="flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {!isPaused && (
              <Button
                size="lg"
                onClick={handleContinue}
                disabled={isSubmitting}
                className="min-w-[280px] h-16 text-xl font-bold bg-primary hover:bg-primary/90 shadow-xl"
              >
                Continue
                <span className="ml-3 text-sm opacity-70 font-normal underline decoration-white/30">
                  (Space)
                </span>
              </Button>
            )}

            {isPaused && (
              <div className="text-center space-y-1">
                <p className="font-medium text-foreground">
                  Session Interrupted
                </p>
                <p className="text-xs text-muted-foreground">
                  Please select your recall quality manually.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button
                variant="destructive"
                onClick={() => handleManualGrade(Rating.Again)}
                disabled={isSubmitting}
                className="min-w-[120px] h-14 text-base font-bold shadow-lg hover:scale-[1.02] transition-all bg-[#8b3d30] hover:bg-[#a64a3a]"
              >
                Forgot
              </Button>
              <Button
                onClick={() => handleManualGrade(Rating.Hard)}
                disabled={isSubmitting}
                className="min-w-[120px] h-14 text-base font-bold bg-[#ca8a04] hover:bg-[#eab308] text-white shadow-lg hover:scale-[1.02] transition-all"
              >
                Struggled
              </Button>
              <Button
                onClick={() => handleManualGrade(Rating.Good)}
                disabled={isSubmitting}
                className="min-w-[120px] h-14 text-base font-bold bg-[#1e3a8a]/70 hover:bg-[#1e3a8a] text-white shadow-lg hover:scale-[1.02] transition-all"
              >
                Recalled
              </Button>
              <Button
                onClick={() => handleManualGrade(Rating.Easy)}
                disabled={isSubmitting}
                className="min-w-[120px] h-14 text-base font-bold bg-[#14532d] hover:bg-[#166534] text-white shadow-lg hover:scale-[1.02] transition-all"
              >
                Mastered
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press 1-4 to grade
            </p>
          </div>
        )}
      </div>

      {/* Back navigation */}
      <div className="text-center pt-8">
        <button
          onClick={navigateToCapture}
          className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Capture
        </button>
      </div>
    </div>
  );
}
