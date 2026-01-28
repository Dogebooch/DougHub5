import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, SkipForward, Zap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export interface QuizQuestion {
  blockId: string;
  questionText: string;
  correctAnswer: string;
  acceptableAnswers: string[];
  originalFact: string;
}

export interface QuizAnswer {
  blockId: string;
  userAnswer: string;
  isCorrect: boolean;
  wasSkipped: boolean;
}

interface TopicQuizResultsProps {
  topicPageId: string;
  questions: QuizQuestion[];
  answers: QuizAnswer[];
  onComplete: (forgottenBlockIds: string[]) => void;
}

/**
 * TopicQuizResults
 *
 * Shows quiz results and activates dormant cards for forgotten facts.
 */
export function TopicQuizResults({
  questions,
  answers,
  onComplete,
}: TopicQuizResultsProps) {
  const { toast } = useToast();
  const [activatingCards, setActivatingCards] = useState(false);
  const [activatedCount, setActivatedCount] = useState(0);

  const correctCount = answers.filter((a) => a.isCorrect).length;
  const totalCount = answers.length;
  const forgottenBlockIds = answers
    .filter((a) => !a.isCorrect)
    .map((a) => a.blockId);

  // Auto-activate dormant cards for forgotten blocks
  useEffect(() => {
    const activateForgottenCards = async () => {
      if (forgottenBlockIds.length === 0) return;

      setActivatingCards(true);

      try {
        let activated = 0;

        for (const blockId of forgottenBlockIds) {
          // Get cards for this block
          const cardsResult = await window.api.cards.getBySiblings(blockId);
          if (cardsResult.data) {
            // Activate any dormant cards
            for (const card of cardsResult.data) {
              if (card.activationStatus === "dormant") {
                await window.api.cards.activate(card.id, "auto", [
                  "Forgotten in topic entry quiz",
                ]);
                activated++;
              }
            }
          }
        }

        setActivatedCount(activated);

        if (activated > 0) {
          toast({
            title: "Cards Activated",
            description: `${activated} dormant card${activated !== 1 ? "s" : ""} added to your review queue.`,
          });
        }
      } catch (err) {
        console.error("Failed to activate forgotten cards:", err);
      } finally {
        setActivatingCards(false);
      }
    };

    activateForgottenCards();
  }, [forgottenBlockIds, toast]);

  const getScoreColor = () => {
    if (totalCount === 0) return "text-foreground";
    const percentage = (correctCount / totalCount) * 100;
    if (percentage >= 80) return "text-success";
    if (percentage >= 50) return "text-warning";
    return "text-destructive";
  };

  return (
    <div className="space-y-6 py-4">
      {/* Score Summary */}
      <div className="text-center space-y-2">
        <div className={cn("text-4xl font-bold", getScoreColor())}>
          {correctCount}/{totalCount}
        </div>
        <p className="text-sm text-muted-foreground">
          {correctCount === totalCount
            ? "Perfect! You remembered everything."
            : forgottenBlockIds.length === 1
              ? "1 concept needs review"
              : `${forgottenBlockIds.length} concepts need review`}
        </p>
      </div>

      {/* Results List */}
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {questions.map((question, i) => {
          const answer = answers[i];
          if (!answer) return null;

          return (
            <div
              key={question.blockId + i}
              className={cn(
                "p-3 rounded-lg border text-sm",
                answer.isCorrect
                  ? "bg-success/5 border-success/20"
                  : "bg-destructive/5 border-destructive/20"
              )}
            >
              <div className="flex items-start gap-2">
                {answer.isCorrect ? (
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                ) : answer.wasSkipped ? (
                  <SkipForward className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{question.questionText}</p>
                  {!answer.isCorrect && (
                    <div className="mt-2 space-y-1 text-xs">
                      {answer.userAnswer && (
                        <p className="text-destructive">
                          <span className="font-semibold">Your answer:</span> {answer.userAnswer}
                        </p>
                      )}
                      <p className="text-success font-medium">
                        <span className="font-semibold">Correct:</span> {question.correctAnswer}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Activation Status */}
      {forgottenBlockIds.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Zap className="h-4 w-4 text-success" />
          {activatingCards ? (
            <span>Activating dormant cards...</span>
          ) : (
            <span>
              {activatedCount > 0
                ? `${activatedCount} dormant card${activatedCount !== 1 ? "s" : ""} activated`
                : "No dormant cards to activate"}
            </span>
          )}
        </div>
      )}

      {/* Continue Button */}
      <Button
        onClick={() => onComplete(forgottenBlockIds)}
        className="w-full gap-2"
        disabled={activatingCards}
      >
        Continue to Topic
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
