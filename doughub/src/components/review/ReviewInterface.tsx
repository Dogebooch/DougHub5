import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { Button } from '@/components/ui/button';

export function ReviewInterface() {
  const { cards, notes, isHydrated, setCurrentView } = useAppStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);

  const dueCards = cards.filter((card) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const cardDate = card.dueDate.split('T')[0];
    return cardDate <= todayStr;
  });

  const currentCard = dueCards[currentIndex];
  const totalCards = dueCards.length;
  const progressPercent = totalCards > 0 ? Math.round(((currentIndex + 1) / totalCards) * 100) : 0;

  const currentNote = currentCard ? notes.find((note) => note.id === currentCard.noteId) : null;

  const handleShowAnswer = useCallback(() => {
    setAnswerVisible(true);
  }, []);

  const navigateToCapture = useCallback(() => {
    setCurrentView('capture');
  }, [setCurrentView]);

  const handleContinue = useCallback(() => {
    if (currentIndex < totalCards - 1) {
      setCurrentIndex(currentIndex + 1);
      setAnswerVisible(false);
    } else {
      setSessionComplete(true);
      setTimeout(() => {
        setCurrentView('capture');
      }, 2000);
    }
  }, [currentIndex, totalCards, setCurrentView]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        if (!answerVisible) {
          handleShowAnswer();
        } else {
          handleContinue();
        }
      } else if (e.key === "Escape") {
        navigateToCapture();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [answerVisible, handleShowAnswer, handleContinue, navigateToCapture]);

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-pulse text-lg text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (totalCards === 0) {
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
          <h1 className="text-4xl font-semibold text-foreground">Session complete!</h1>
          <p className="text-muted-foreground">Redirecting to Capture page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Card {currentIndex + 1} of {totalCards} - {progressPercent}%
            complete
          </span>
        </div>
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="bg-card border rounded-lg p-12 space-y-8">
        <div className="text-center space-y-6">
          <div className="text-3xl font-medium leading-relaxed">
            {currentCard.front}
          </div>

          {answerVisible && (
            <div className="pt-6 border-t space-y-4">
              <div className="text-2xl leading-relaxed text-foreground/90">
                {currentCard.back}
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-sm text-muted-foreground pt-4 border-t">
          From: {currentNote ? currentNote.title : "Unknown source"}
        </div>
      </div>

      <div className="flex justify-center">
        {!answerVisible ? (
          <Button
            size="lg"
            onClick={handleShowAnswer}
            className="min-w-[200px]"
          >
            Show Answer
          </Button>
        ) : (
          <Button size="lg" onClick={handleContinue} className="min-w-[200px]">
            Continue
          </Button>
        )}
      </div>

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
