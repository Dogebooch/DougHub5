import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
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

  // Time tracking for response time and timeout (Task 5.2)
  const [responseStartTime, setResponseStartTime] = useState<number | null>(
    null
  );
  const [isPaused, setIsPaused] = useState(false);

  // Track mount status
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
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

  const handleRating = useCallback(
    async (rating: (typeof Rating)[keyof typeof Rating]): Promise<boolean> => {
      if (!currentCard || isSubmitting) return false;

      setIsSubmitting(true);
      try {
        const result = await scheduleCardReview(currentCard.id, rating);

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
              setTimeout(() => {
                if (isMounted.current) setCurrentView("capture");
              }, 2000);
            }
          }
        }
        return true;
      } catch (error) {
        console.error("[Review] Error submitting rating:", error);
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

  const handleContinue = useCallback(async () => {
    if (!responseStartTime || isSubmitting) return;

    const rawResponseTimeMs = Date.now() - responseStartTime;

    // Prevent accidental double-taps/skipping answer
    if (rawResponseTimeMs < CONTINUE_LOCKOUT_MS) return;

    // -1 signals an interrupted session (user exceeded timeout)
    const responseTimeMs = isPaused ? -1 : rawResponseTimeMs;

    console.log(`[Review] Response time: ${responseTimeMs}ms`);

    // Placeholder until 5.3's auto-rating logic
    const success = await handleRating(Rating.Good);

    if (success && isMounted.current) {
      // Reset for next card
      setResponseStartTime(null);
      setIsPaused(false);
    }
  }, [responseStartTime, isPaused, handleRating, isSubmitting]);

  const handleForgot = useCallback(async () => {
    if (isSubmitting) return;

    // Explicitly forced Again rating
    const success = await handleRating(Rating.Again);

    if (success && isMounted.current) {
      // Reset for next card
      setResponseStartTime(null);
      setIsPaused(false);
    }
  }, [handleRating, isSubmitting]);

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
        if (!answerVisible) {
          handleShowAnswer();
        } else if (!isSubmitting) {
          handleContinue();
        }
      } else if (e.key === "Enter" && answerVisible && !isSubmitting) {
        handleContinue();
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
    navigateToCapture,
    isSubmitting,
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
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Card display */}
      <div className="bg-card border rounded-lg p-12 space-y-8">
        <div className="text-center space-y-6">
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
            <div className="text-3xl font-medium leading-relaxed">
              {currentCard.front}
            </div>
          )}

          {answerVisible && (
            <div className="pt-6 border-t space-y-4">
              {/* Back - Use cloze answer for cloze types */}
              {currentCard.cardType === "cloze" ||
              currentCard.cardType === "list-cloze" ? (
                <ClozeAnswer back={currentCard.back} />
              ) : (
                <div className="text-2xl leading-relaxed text-foreground/90">
                  {currentCard.back}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="text-center text-sm text-muted-foreground pt-4 border-t">
          From: {currentNote ? currentNote.title : "Unknown source"}
          {currentCard.state > 0 && (
            <span className="ml-2">
              • Stability: {currentCard.stability.toFixed(1)} • Reps:{" "}
              {currentCard.reps}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-center">
        {!answerVisible ? (
          <Button
            size="lg"
            onClick={handleShowAnswer}
            className="min-w-[200px]"
          >
            Show Answer
            <span className="ml-2 text-xs opacity-70">(Space)</span>
          </Button>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Button
              size="lg"
              onClick={handleContinue}
              disabled={isSubmitting}
              className="min-w-[200px]"
            >
              Continue
              <span className="ml-2 text-xs opacity-70">(Space)</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleForgot}
              disabled={isSubmitting}
              className="text-muted-foreground hover:text-destructive"
            >
              I forgot this
            </Button>
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
