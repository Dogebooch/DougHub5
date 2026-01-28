import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Brain, 
  ChevronRight, 
  Clock, 
  Zap, 
  Ban,
  Check,
  Info
} from "lucide-react";
import { 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { GradeAnswerResult } from "@/types/ai";
import { cn } from "@/lib/utils";
import { 
  ChartContainer, 
  ChartConfig, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";

interface QuizResultsScreenProps {
  questions: Array<{
    questionText: string;
    correctAnswer: string;
    userAnswer: string;
    isCorrect: boolean;
    wasSkipped: boolean;
    gradeResult: GradeAnswerResult;
  }>;
  activationDecisions: Array<{
    factIndex: number;
    tier: 'auto' | 'suggested' | 'dormant';
    reasons: string[];
    cardId?: string;
  }>;
  onActivate: (factIndex: number) => void;
  onSuspend: (factIndex: number) => void;
  onReviewAgain?: () => void;
  onComplete: () => void;
}

const QuizResultsScreen: React.FC<QuizResultsScreenProps> = ({
  questions = [],
  activationDecisions = [],
  onActivate,
  onSuspend,
  onReviewAgain,
  onComplete,
}) => {
  const correctCount = questions.filter(q => q.isCorrect && !q.wasSkipped).length;
  const totalCount = questions.length;
  const incorrectCount = questions.filter(q => !q.isCorrect && !q.wasSkipped).length;
  const skippedCount = questions.filter(q => q.wasSkipped).length;

  const autoActiveCount = activationDecisions.filter(d => d.tier === 'auto').length;
  const suggestedCount = activationDecisions.filter(d => d.tier === 'suggested').length;
  const dormantCount = activationDecisions.filter(d => d.tier === 'dormant').length;

  const successRate = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;

  const chartData = [
    { tier: "auto", value: autoActiveCount, fill: "var(--color-auto)" },
    { tier: "suggested", value: suggestedCount, fill: "var(--color-suggested)" },
    { tier: "dormant", value: dormantCount, fill: "var(--color-dormant)" },
  ].filter(d => d.value > 0);

  const chartConfig = {
    auto: {
      label: "Auto-Active",
      color: "hsl(var(--success))",
    },
    suggested: {
      label: "Suggested",
      color: "hsl(var(--warning))",
    },
    dormant: {
      label: "Dormant",
      color: "hsl(var(--muted-foreground))",
    },
  } satisfies ChartConfig;

  return (
    <div className="flex flex-col h-full max-h-[80vh] overflow-hidden">
      {/* Header Summary */}
      <div className="p-6 bg-muted/5 border-b">
        <div className="flex items-center justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary" />
              Quiz Results
            </h2>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="text-success font-bold">{autoActiveCount} cards activated</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{dormantCount} dormant</span>
              <span className="mx-2 text-muted-foreground/30">|</span>
              <span className="text-muted-foreground font-medium">
                {correctCount} of {totalCount} correct ({Math.round(successRate)}%)
              </span>
            </div>
            
            <div className="mt-6 space-y-2 max-w-md">
              <div className="flex w-full h-2 rounded-full overflow-hidden bg-secondary">
                {totalCount > 0 && (
                  <>
                    <div 
                      className="h-full bg-success transition-all" 
                      style={{ width: `${(correctCount / totalCount) * 100}%` }} 
                    />
                    <div 
                      className="h-full bg-destructive transition-all" 
                      style={{ width: `${(incorrectCount / totalCount) * 100}%` }}
                    />
                    <div 
                      className="h-full bg-muted transition-all" 
                      style={{ width: `${(skippedCount / totalCount) * 100}%` }}
                    />
                  </>
                )}
              </div>
              <div className="flex justify-between text-[11px] font-medium text-muted-foreground px-1">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-success" /> Correct</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-destructive" /> Incorrect</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-muted" /> Skipped</div>
              </div>
            </div>
          </div>

          {/* Pie Chart Summary */}
          {chartData.length > 0 && (
            <div className="relative shrink-0 flex items-center justify-center">
              <ChartContainer config={chartConfig} className="h-32 w-32">
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="tier"
                    paddingAngle={2}
                    innerRadius={30}
                    strokeWidth={0}
                    animationDuration={1000}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black leading-none">{autoActiveCount}</span>
                <span className="text-[9px] font-bold uppercase tracking-tighter text-muted-foreground">Active</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content: Question List */}
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6 pb-6 mt-2">
          {questions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No questions performance data available.</p>
            </div>
          ) : (
            questions.map((q, idx) => {
              const decision = activationDecisions.find(d => d.factIndex === idx);
              
              return (
                <Card key={idx} className="overflow-hidden border-border/50 hover:border-border transition-colors">
                  <div className="p-4 flex flex-col gap-4">
                    {/* Header: Question Status + Tier Badge */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {q.wasSkipped ? (
                          <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
                        ) : q.isCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive shrink-0" />
                        )}
                        <h3 className="font-semibold text-sm leading-tight">{q.questionText}</h3>
                      </div>
                      
                      {decision && (
                        <Badge 
                          className={cn(
                            "uppercase text-[10px] tracking-widest font-black px-2 py-0.5 whitespace-nowrap",
                            decision.tier === 'auto' && "bg-success/15 text-success hover:bg-success/20 border-success/30",
                            decision.tier === 'suggested' && "bg-warning/15 text-warning hover:bg-warning/20 border-warning/30",
                            decision.tier === 'dormant' && "bg-muted text-muted-foreground hover:bg-muted/90"
                          )}
                          variant="outline"
                        >
                          {decision.tier === 'auto' ? 'AUTO-ACTIVE' : decision.tier.toUpperCase()}
                        </Badge>
                      )}
                    </div>

                    {/* Answer Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <div className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">Your Answer</div>
                        <div className={cn(
                          "px-3 py-2 rounded-md font-medium border",
                          q.wasSkipped ? "bg-muted/30 text-muted-foreground italic border-transparent" : 
                          q.isCorrect ? "bg-success/5 text-success border-success/20" : "bg-destructive/5 text-destructive border-destructive/20"
                        )}>
                          {q.wasSkipped ? "Skipped" : q.userAnswer || "No answer"}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">Correct Answer</div>
                        <div className="px-3 py-2 bg-primary/5 text-primary rounded-md font-bold border border-primary/10">
                          {q.correctAnswer}
                        </div>
                      </div>
                    </div>

                    {/* AI Feedback */}
                    {q.gradeResult?.feedback && (
                      <div className="text-xs italic text-muted-foreground bg-muted/20 p-3 rounded-lg border-l-2 border-primary/30 flex gap-2.5">
                        <Brain className="w-4 h-4 text-primary shrink-0 opacity-70" />
                        <p className="leading-relaxed">{q.gradeResult.feedback}</p>
                      </div>
                    )}

                    {/* Reasons list */}
                    {decision && decision.reasons.length > 0 && (
                      <div className="bg-muted/30 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground mb-2 uppercase tracking-widest">
                          <Info className="w-3 h-3" />
                          Activation Logic
                        </div>
                        <ul className="space-y-1.5">
                          {decision.reasons.map((reason, ridx) => (
                            <li key={ridx} className="text-xs text-muted-foreground flex items-start gap-2 leading-tight">
                              <span className="mt-1.5 w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0" />
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end pt-2 border-t border-border/10">
                      {decision && (
                        <>
                          {decision.tier === 'auto' ? (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 font-bold text-xs"
                              onClick={() => onSuspend(idx)}
                            >
                              <Ban className="w-3.5 h-3.5 mr-2" />
                              Suspend Card
                            </Button>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="border-success/30 text-success hover:bg-success/10 h-8 font-bold text-xs"
                              onClick={() => onActivate(idx)}
                            >
                              <Zap className="w-3.5 h-3.5 mr-2 text-success" />
                              Activate Now
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Bottom Footer Actions */}
      <div className="p-6 border-t bg-muted/20 flex items-center justify-between gap-4">
        <div>
          {onReviewAgain && (
            <Button variant="outline" onClick={onReviewAgain} className="h-11 px-6 font-semibold">
              <Clock className="w-4 h-4 mr-2" />
              Review Again
            </Button>
          )}
        </div>
        <Button onClick={onComplete} className="h-11 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg shadow-lg shadow-primary/20">
          <Check className="w-5 h-5 mr-2" />
          Add to Topic
          <ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default QuizResultsScreen;
export type { QuizResultsScreenProps };

