import React, { useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  HelpCircle,
  Brain
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GradeAnswerResult } from "@/types/ai";

/**
 * Props for the QuizQuestionCard component.
 */
interface QuizQuestionCardProps {
  questionNumber: number;
  totalQuestions: number;
  question: {
    questionText: string;
    correctAnswer: string;
    acceptableAnswers: string[];
    sourceFact: string;
    difficulty: 'easy' | 'medium' | 'hard';
  };
  userAnswer: string;
  onAnswerChange: (answer: string) => void;
  onSkip: () => void;
  onSubmit: () => void;
  isSubmitted: boolean;
  isProcessing?: boolean;
  gradeResult?: GradeAnswerResult | null;
}

/**
 * QuizQuestionCard renders a single fill-in-the-blank question for the Intake Quiz.
 * It handles input, submission, grading feedback, and comparison views.
 */
export const QuizQuestionCard: React.FC<QuizQuestionCardProps> = ({
  questionNumber,
  totalQuestions,
  question,
  userAnswer,
  onAnswerChange,
  onSkip,
  onSubmit,
  isSubmitted,
  isProcessing = false,
  gradeResult,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input when the question is first presented
  useEffect(() => {
    if (!isSubmitted && !isProcessing) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [questionNumber, isSubmitted, isProcessing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && userAnswer.trim() && !isSubmitted && !isProcessing) {
      onSubmit();
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return "bg-success/10 text-success border-success/20";
      case 'medium':
        return "bg-warning/10 text-warning border-warning/20";
      case 'hard':
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground border-muted";
    }
  };

  // Logic to render the question text with a visual blank
  const parts = question.questionText.split('_____');
  const renderedQuestionText = parts.map((part, i) => (
    <React.Fragment key={i}>
      {part}
      {i < parts.length - 1 && (
        <span 
          className="mx-1 border-b-2 border-primary min-w-[100px] inline-block h-6 align-middle bg-primary/5 rounded-t-sm"
          aria-hidden="true"
        />
      )}
    </React.Fragment>
  ));

  const isSkipped = isSubmitted && !gradeResult;

  return (
    <Card className="w-full shadow-md border-border/50 overflow-hidden bg-card text-card-foreground">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-secondary/10">
        <div className="space-y-1">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Question {questionNumber} of {totalQuestions}
          </CardTitle>
          <Badge variant="outline" className={cn("mt-1 capitalize px-2 py-0 font-medium", getDifficultyColor(question.difficulty))}>
            {question.difficulty}
          </Badge>
        </div>
        <Brain className="h-5 w-5 text-primary/40" />
      </CardHeader>

      <CardContent className="space-y-8 pt-6">
        <div 
          className="text-xl leading-relaxed min-h-[5rem] font-serif"
          id={`question-text-${questionNumber}`}
        >
          {renderedQuestionText}
        </div>

        {!isSubmitted ? (
          <div className="space-y-4">
            <div className="relative group">
              <Input
                ref={inputRef}
                placeholder="Type the missing concept..."
                value={userAnswer}
                onChange={(e) => onAnswerChange(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isProcessing}
                className="text-lg h-14 pr-12 focus-visible:ring-primary/50 transition-all border-border shadow-sm"
                aria-labelledby={`question-text-${questionNumber}`}
              />
              <div className="absolute right-4 top-4 flex items-center">
                {isProcessing ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : (
                  <div className="text-[10px] font-mono text-muted-foreground opacity-0 group-focus-within:opacity-100 transition-opacity flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded border bg-muted">Enter</kbd> to submit
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div 
            className={cn(
              "rounded-xl p-5 space-y-4 border transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 shadow-sm",
              gradeResult?.isCorrect 
                ? "bg-primary/5 border-primary/30" 
                : isSkipped
                  ? "bg-muted/50 border-muted"
                  : "bg-destructive/5 border-destructive/30"
            )}
            aria-live="polite"
          >
            <div className="flex items-start gap-4">
              <div className={cn(
                "p-2 rounded-full shrink-0",
                gradeResult?.isCorrect ? "bg-primary/20 text-primary" : isSkipped ? "bg-muted text-muted-foreground" : "bg-destructive/20 text-destructive"
              )}>
                {gradeResult?.isCorrect ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : isSkipped ? (
                  <HelpCircle className="h-6 w-6" />
                ) : (
                  <XCircle className="h-6 w-6" />
                )}
              </div>
              
              <div className="space-y-1.5 flex-1 overflow-hidden">
                <p className={cn(
                  "text-lg font-bold tracking-tight",
                  gradeResult?.isCorrect ? "text-primary" : isSkipped ? "text-muted-foreground" : "text-destructive"
                )}>
                  {gradeResult?.isCorrect ? "Correct!" : isSkipped ? "Skipped" : "Incorrect"}
                </p>
                
                <p className="text-base text-foreground/90 leading-relaxed italic pr-2">
                  {gradeResult?.feedback || (isSkipped ? "No answer provided. Active learning requires identifying your own gaps." : "")}
                </p>

                {isSubmitted && !gradeResult?.isCorrect && !isSkipped && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-destructive/10 rounded-md border border-destructive/20">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Your Answer</p>
                      <p className="text-md font-medium line-through decoration-destructive/50 truncate" title={userAnswer}>{userAnswer || "(None)"}</p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-md border border-primary/20">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Correct Answer</p>
                      <p className="text-md font-bold text-primary truncate" title={question.correctAnswer}>{question.correctAnswer}</p>
                    </div>
                  </div>
                )}
                
                {isSkipped && (
                   <div className="mt-4 p-3 bg-primary/10 rounded-md border border-primary/20">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Correct Answer</p>
                    <p className="text-md font-bold text-primary">{question.correctAnswer}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="pt-4 border-t border-border/10 mt-2">
              <div className="flex items-center gap-2 mb-2 text-primary/70">
                <Brain className="w-3 h-3" />
                <p className="text-[10px] uppercase tracking-widest font-bold">Clinical Pearl Context</p>
              </div>
              <p className="text-sm text-foreground/80 leading-snug pl-3 border-l-2 border-primary/20 font-serif">
                {question.sourceFact}
              </p>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between items-center bg-muted/5 border-t py-4 px-6 mt-2">
        {!isSubmitted ? (
          <>
            <Button 
              variant="ghost" 
              onClick={onSkip}
              disabled={isProcessing}
              className="text-muted-foreground hover:text-foreground h-9"
              size="sm"
            >
              Don't know yet
            </Button>
            <Button 
              onClick={onSubmit}
              disabled={!userAnswer.trim() || isProcessing}
              className="min-w-[140px] h-9 shadow-sm"
              size="sm"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Check Answer
            </Button>
          </>
        ) : (
          <div className="w-full flex justify-end">
            <span className="text-[11px] text-muted-foreground italic flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-success" />
              Progress recorded
            </span>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default QuizQuestionCard;
