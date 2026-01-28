import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Loader2, ArrowRight, HelpCircle } from "lucide-react";
import { NotebookBlock } from "@/types";
import { TopicQuizResults, QuizQuestion, QuizAnswer } from "./TopicQuizResults";

interface TopicQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicPageId: string;
  topicName: string;
  daysSince: number;
  onComplete: (forgottenBlockIds: string[]) => void;
}

const MAX_QUESTIONS = 5;

/**
 * TopicQuizModal
 *
 * Quick retention quiz for topic entry after 7+ days.
 * Tests dormant/priority blocks and activates forgotten cards.
 */
export function TopicQuizModal({
  isOpen,
  onClose,
  topicPageId,
  topicName,
  daysSince,
  onComplete,
}: TopicQuizModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isGrading, setIsGrading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Fetch blocks and generate questions on mount
  useEffect(() => {
    if (!isOpen) {
      // Reset state when closed
      setLoading(true);
      setError(null);
      setQuestions([]);
      setCurrentIndex(0);
      setAnswers([]);
      setCurrentAnswer("");
      setShowResults(false);
      return;
    }

    const generateQuestions = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch all blocks for this topic
        const blocksResult = await window.api.notebookBlocks.getByPage(topicPageId);
        if (blocksResult.error) throw new Error(blocksResult.error);

        const blocks = blocksResult.data || [];
        if (blocks.length === 0) {
          setError("No content to quiz on");
          return;
        }

        // 2. Prioritize blocks:
        // - Blocks with cards (especially if dormant cards exist)
        // - Higher priority score
        // - intakeQuizResult="correct" (proven recall worth testing again)
        const quizzableBlocks = blocks
          .filter((b) => (b.cardCount && b.cardCount > 0) || (b.priorityScore && b.priorityScore >= 30))
          .sort((a, b) => {
            const aScore = (a.priorityScore || 0) + (a.intakeQuizResult === "correct" ? 20 : 0);
            const bScore = (b.priorityScore || 0) + (b.intakeQuizResult === "correct" ? 20 : 0);
            return bScore - aScore;
          })
          .slice(0, MAX_QUESTIONS);

        if (quizzableBlocks.length === 0) {
          // Fallback to any blocks if nothing prioritized
          quizzableBlocks.push(...blocks.slice(0, MAX_QUESTIONS));
        }

        // 3. Generate quiz questions from facts
        const generated: QuizQuestion[] = [];
        
        for (const block of quizzableBlocks) {
          try {
            // First extract facts from the block
            const factsResult = await window.api.ai.extractFacts(
              block.content,
              "manual",
              topicName
            );
            
            if (factsResult.data && factsResult.data.facts.length > 0) {
              // Generate a question for the primary fact
              const quizResult = await window.api.ai.generateQuiz(
                [factsResult.data.facts[0]],
                topicName,
                1
              );
              
              if (quizResult.data && quizResult.data.questions.length > 0) {
                const q = quizResult.data.questions[0];
                generated.push({
                  blockId: block.id,
                  questionText: q.questionText,
                  correctAnswer: q.correctAnswer,
                  acceptableAnswers: q.acceptableAnswers || [],
                  originalFact: block.content,
                });
              }
            }
          } catch (err) {
            console.warn(`Failed to generate question for block ${block.id}:`, err);
          }
          
          if (generated.length >= MAX_QUESTIONS) break;
        }

        if (generated.length === 0) {
          setError("Failed to generate quiz questions");
          return;
        }

        setQuestions(generated);
      } catch (err) {
        console.error("Failed to generate topic quiz:", err);
        setError(err instanceof Error ? err.message : "Failed to load quiz");
      } finally {
        setLoading(false);
      }
    };

    generateQuestions();
  }, [isOpen, topicPageId, topicName]);

  const handleSubmitAnswer = useCallback(async () => {
    if (isGrading || !questions[currentIndex]) return;

    setIsGrading(true);
    const question = questions[currentIndex];

    try {
      // Grade the answer
      const gradeResult = await window.api.ai.gradeAnswer(
        currentAnswer,
        question.correctAnswer,
        question.acceptableAnswers,
        question.originalFact
      );

      const isCorrect = gradeResult.data?.isCorrect ?? false;

      const answer: QuizAnswer = {
        blockId: question.blockId,
        userAnswer: currentAnswer,
        isCorrect,
        wasSkipped: false,
      };

      setAnswers((prev) => [...prev, answer]);

      // Save attempt to database
      window.api.topicQuiz.saveAttempt({
        id: crypto.randomUUID(),
        notebookTopicPageId: topicPageId,
        blockId: question.blockId,
        questionText: question.questionText,
        isCorrect,
        attemptedAt: new Date().toISOString(),
        daysSinceLastVisit: daysSince,
      });

      // Move to next question or show results
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setCurrentAnswer("");
      } else {
        setShowResults(true);
      }
    } catch (err) {
      console.error("Failed to grade answer:", err);
      // On error, treat as incorrect and move on
      setAnswers((prev) => [
        ...prev,
        {
          blockId: question.blockId,
          userAnswer: currentAnswer,
          isCorrect: false,
          wasSkipped: false,
        },
      ]);

      if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setCurrentAnswer("");
      } else {
        setShowResults(true);
      }
    } finally {
      setIsGrading(false);
    }
  }, [currentAnswer, currentIndex, questions, topicPageId, daysSince, isGrading]);

  const handleSkip = useCallback(() => {
    if (!questions[currentIndex]) return;

    const answer: QuizAnswer = {
      blockId: questions[currentIndex].blockId,
      userAnswer: "",
      isCorrect: false,
      wasSkipped: true,
    };

    setAnswers((prev) => [...prev, answer]);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setCurrentAnswer("");
    } else {
      setShowResults(true);
    }
  }, [currentIndex, questions]);

  const handleResultsComplete = useCallback(
    (forgottenBlockIds: string[]) => {
      onComplete(forgottenBlockIds);
    },
    [onComplete]
  );

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {showResults ? "Quiz Results" : `Retention Check: ${topicName}`}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Recalling focus points...</p>
          </div>
        )}

        {error && !loading && (
          <div className="py-8 text-center">
            <p className="text-destructive mb-4 text-sm font-medium">{error}</p>
            <Button variant="outline" onClick={onClose}>
              Continue to Topic
            </Button>
          </div>
        )}

        {!loading && !error && !showResults && currentQuestion && (
          <div className="space-y-6 py-4">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>Question {currentIndex + 1} of {questions.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>

            {/* Question */}
            <div className="space-y-4">
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-base leading-relaxed font-medium">
                  {currentQuestion.questionText}
                </p>
              </div>

              <Input
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Type your answer..."
                disabled={isGrading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && currentAnswer.trim()) {
                    handleSubmitAnswer();
                  }
                }}
                autoFocus
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-2">
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={isGrading}
                className="gap-2 text-muted-foreground hover:text-foreground"
                size="sm"
              >
                <HelpCircle className="h-4 w-4" />
                Don't know
              </Button>

              <Button
                onClick={handleSubmitAnswer}
                disabled={!currentAnswer.trim() || isGrading}
                className="gap-2 min-w-[100px]"
              >
                {isGrading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {currentIndex < questions.length - 1 ? "Next" : "Finish"}
              </Button>
            </div>
          </div>
        )}

        {showResults && (
          <TopicQuizResults
            topicPageId={topicPageId}
            questions={questions}
            answers={answers}
            onComplete={handleResultsComplete}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
