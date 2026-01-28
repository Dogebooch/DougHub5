import React, { useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, Loader2, HelpCircle, Brain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  gradeResult?: {
    isCorrect: boolean;
    feedback: string;
  };
}

export const QuizQuestionCard: React.FC<QuizQuestionCardProps> = ({
  questionNumber, totalQuestions, question, userAnswer, onAnswerChange,
  onSkip, onSubmit, isSubmitted, isProcessing = false, gradeResult,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isSubmitted && !isProcessing) inputRef.current?.focus();
  }, [questionNumber, isSubmitted, isProcessing]);

  const parts = question.questionText.split('_____');
  const isSkipped = isSubmitted && !gradeResult;

  return (
    <Card className="w-full shadow-md border-border/50 overflow-hidden bg-card text-card-foreground">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-secondary/10">
        <div className="space-y-1">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Question {questionNumber} of {totalQuestions}
          </CardTitle>
          <Badge variant="outline" className="mt-1 capitalize px-2 py-0 font-medium">
            {question.difficulty}
          </Badge>
        </div>
        <Brain className="h-5 w-5 text-primary/40" />
      </CardHeader>

      <CardContent className="space-y-8 pt-6">
        <div className="text-xl leading-relaxed min-h-[5rem] font-serif">
          {parts.map((p, i) => <React.Fragment key={i}>{p}{i < parts.length - 1 && <span className="mx-1 border-b-2 border-primary min-w-[100px] inline-block h-6 align-middle bg-primary/5" />}</React.Fragment>)}
        </div>

        {!isSubmitted ? (
          <div className="relative">
            <Input
              ref={inputRef}
              placeholder="Type the missing concept..."
              value={userAnswer}
              onChange={(e) => onAnswerChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && userAnswer.trim() && onSubmit()}
              disabled={isProcessing}
              className="text-lg h-14"
            />
            {isProcessing && <Loader2 className="absolute right-4 top-4 h-6 w-6 animate-spin text-primary" />}
          </div>
        ) : (
          <div className={cn("rounded-xl p-5 space-y-4 border animate-in fade-in slide-in-from-bottom-4 shadow-sm", gradeResult?.isCorrect ? "bg-primary/5 border-primary/30" : isSkipped ? "bg-muted/50 border-muted" : "bg-destructive/5 border-destructive/30")}>
            <div className="flex items-start gap-4">
              <div className={cn("p-2 rounded-full shrink-0", gradeResult?.isCorrect ? "bg-primary/20 text-primary" : isSkipped ? "bg-muted text-muted-foreground" : "bg-destructive/20 text-destructive")}>
                {gradeResult?.isCorrect ? <CheckCircle2 className="h-6 w-6" /> : isSkipped ? <HelpCircle className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
              </div>
              <div className="space-y-1.5 flex-1">
                <p className={cn("text-lg font-bold", gradeResult?.isCorrect ? "text-primary" : isSkipped ? "text-muted-foreground" : "text-destructive")}>
                  {gradeResult?.isCorrect ? "Correct!" : isSkipped ? "Skipped" : "Incorrect"}
                </p>
                <p className="text-base italic">{gradeResult?.feedback || (isSkipped ? "No answer provided." : "")}</p>
                {isSubmitted && !gradeResult?.isCorrect && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-destructive/10 rounded-md border border-destructive/20">
                      <p className="text-[10px] uppercase font-bold mb-1">Your Answer</p>
                      <p className="line-through decoration-destructive/50">{userAnswer || "(None)"}</p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-md border border-primary/20">
                      <p className="text-[10px] uppercase font-bold mb-1">Correct Answer</p>
                      <p className="font-bold text-primary">{question.correctAnswer}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="pt-4 border-t border-border/10">
              <p className="text-[10px] uppercase tracking-widest font-bold text-primary/70 mb-2">Clinical Pearl Context</p>
              <p className="text-sm font-serif pl-3 border-l-2 border-primary/20">{question.sourceFact}</p>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between items-center bg-muted/5 border-t py-4 mt-2">
        {!isSubmitted ? (
          <>
            <Button variant="ghost" onClick={onSkip} disabled={isProcessing}>Don't know yet</Button>
            <Button onClick={onSubmit} disabled={!userAnswer.trim() || isProcessing}>Check Answer</Button>
          </>
        ) : (
          <div className="w-full flex justify-end text-[11px] text-muted-foreground italic">Progress recorded</div>
        )}
      </CardFooter>
    </Card>
  );
};

export default QuizQuestionCard;
