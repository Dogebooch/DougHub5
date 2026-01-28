import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Brain,
  Forward,
  Check,
  Plus,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  QuizQuestion,
  GradeAnswerResult,
  ExtractedFact,
} from "@/types/ai";
import { CanonicalTopic, NotebookBlock, Card, IntakeQuizResultType, SourceItem } from "@/types";
import { QuizQuestionCard } from "./QuizQuestionCard";
import {
  determineActivationTier,
  activationToCardFields,
  type ActivationDecision,
  type ActivationContext
} from '@/lib/activation';

interface FullQuizModeProps {
  sourceItem: {
    id: string;
    title: string;
    content: string;
    sourceType: string;
    correctness?: 'correct' | 'incorrect' | null;
  };
  suggestedTopics: string[];
  onComplete: (result: {
    selectedTopicIds: string[];
    blocksCreated: number;
    cardsCreated: number;
  }) => void;
  onCancel: () => void;
}

type QuizStep = 'topic-select' | 'loading' | 'quiz' | 'results';

interface QuizAnswer {
  answer: string;
  isCorrect: boolean;
  gradeResult: GradeAnswerResult | null;
  timestamp: number;
}

export const FullQuizMode: React.FC<FullQuizModeProps> = ({
  sourceItem,
  suggestedTopics = [],
  onComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<QuizStep>('topic-select');
  const [selectedTopics, setSelectedTopics] = useState<CanonicalTopic[]>([]);
  const [facts, setFacts] = useState<ExtractedFact[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, QuizAnswer>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [activatedCards, setActivatedCards] = useState<Set<number>>(new Set());
  const [activationDecisions, setActivationDecisions] = useState<Map<number, ActivationDecision>>(new Map());
  const [isSaving, setIsSaving] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);

  const { toast } = useToast();

  const handleTopicToggle = async (topicName: string) => {
    const isAlreadySelected = selectedTopics.find(t => t.canonicalName === topicName);
    if (isAlreadySelected) {
      setSelectedTopics(prev => prev.filter(t => t.canonicalName !== topicName));
    } else {
      setIsProcessing(true);
      try {
        const result = await window.api.canonicalTopics.createOrGet(topicName);
        if (result.data) {
          setSelectedTopics(prev => [...prev, result.data!]);
          setCustomTopic(""); 
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to resolve topic",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const startQuiz = async () => {
    if (selectedTopics.length === 0) {
      toast({
        title: "Selection Required",
        description: "Please select at least one topic.",
      });
      return;
    }

    setStep('loading');
    setIsProcessing(true);

    try {
      const topicContext = selectedTopics.map(t => t.canonicalName).join(", ");
      
      const factsResult = await window.api.ai.extractFacts(
        sourceItem.content,
        sourceItem.sourceType,
        topicContext
      );

      if (!factsResult.data || factsResult.data.facts.length === 0) {
        throw new Error("No facts could be extracted from this content.");
      }
      setFacts(factsResult.data.facts);

      const quizResult = await window.api.ai.generateQuiz(
        factsResult.data.facts,
        topicContext,
        5 
      );

      if (!quizResult.data || quizResult.data.questions.length === 0) {
        throw new Error("Failed to generate quiz questions.");
      }
      setQuestions(quizResult.data.questions);

      const allIndices = new Set<number>();
      quizResult.data.questions.forEach((_q: QuizQuestion, i: number) => allIndices.add(i));
      setActivatedCards(allIndices);

      setStep('quiz');
    } catch (error: any) {
      toast({
        title: "Intake Failed",
        description: error.message || "Failed to process content with AI",
        variant: "destructive",
      });
      setStep('topic-select');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGradeAnswer = async () => {
    if (!userAnswer.trim()) return;

    const currentQuestion = questions[currentQuestionIndex];
    setIsProcessing(true);

    try {
      const result = await window.api.ai.gradeAnswer(
        userAnswer,
        currentQuestion.correctAnswer,
        currentQuestion.acceptableAnswers,
        `Topic: ${selectedTopics.map(t => t.canonicalName).join(", ")}, Question: ${currentQuestion.questionText}`
      );

      if (result.data) {
        const newAnswers = new Map(answers);
        newAnswers.set(currentQuestionIndex, {
          answer: userAnswer,
          isCorrect: result.data.isCorrect,
          gradeResult: result.data,
          timestamp: Date.now(),
        });
        setAnswers(newAnswers);
      }
    } catch (error) {
      toast({
        title: "Grading Error",
        description: "AI grading failed. You can still proceed.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateActivations = useCallback(() => {
    const decisions = new Map<number, ActivationDecision>();
    const autoActiveIndices = new Set<number>();

    questions.forEach((question, idx) => {
      const answer = answers.get(idx);
      
      let quizResult: IntakeQuizResultType | null = null;
      if (isSkipped) {
        quizResult = 'skipped';
      } else if (answer) {
        quizResult = answer.isCorrect ? 'correct' : 'wrong';
      } 

      const context: ActivationContext = {
        quizResult,
        factContent: question.sourceFact,
        sourceWasIncorrect: sourceItem.correctness === 'incorrect',
        crossSourceCount: 0,
        hasConfusionPattern: false,
      };

      const decision = determineActivationTier(context);
      decisions.set(idx, decision);

      if (decision.status === 'active') {
        autoActiveIndices.add(idx);
      }
    });

    setActivationDecisions(decisions);
    setActivatedCards(autoActiveIndices);
  }, [questions, answers, sourceItem.correctness, isSkipped]);

  useEffect(() => {
    if (step === 'results') {
      calculateActivations();
    }
  }, [step, calculateActivations]);

  const handleCompleteInternal = async () => {
    setIsSaving(true);
    let blocksCreatedCount = 0;
    let cardsCreatedCount = 0;

    try {
      const timestamp = new Date().toISOString();
      const score = Array.from(answers.values()).filter(a => a.isCorrect).length;
      let quizPerformance: 'correct' | 'wrong' | 'skipped' = 'skipped';
      
      if (!isSkipped && questions.length > 0) {
        quizPerformance = (score / questions.length) >= 0.7 ? 'correct' : 'wrong';
      }

      for (const topic of selectedTopics) {
        const pageResult = await window.api.notebookPages.getByTopic(topic.id);
        let topicPage: any;

        if (pageResult.data) {
          topicPage = pageResult.data;
        } else {
          const createResult = await window.api.notebookPages.create({
            id: crypto.randomUUID(),
            canonicalTopicId: topic.id,
            cardIds: [],
            createdAt: timestamp,
            updatedAt: timestamp,
          });
          if (createResult.data) {
            topicPage = createResult.data;
          } else {
            console.error("Failed to create topic page for:", topic.canonicalName);
            continue;
          }
        }

        const blockId = crypto.randomUUID();
        const blockResult = await window.api.notebookBlocks.create({
          id: blockId,
          notebookTopicPageId: topicPage!.id,
          sourceItemId: sourceItem.id,
          content: `Intake Notes: ${sourceItem.title}`,
          userInsight: sourceItem.content.substring(0, 500), 
          position: 0,
          cardCount: activatedCards.size,
          isHighYield: sourceItem.correctness === 'incorrect',
          calloutType: sourceItem.correctness === 'incorrect' ? 'trap' : 'pearl',
          intakeQuizResult: quizPerformance,
        } as NotebookBlock);

        if (blockResult.data) {
          blocksCreatedCount++;
          
          for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            const isManualActivated = activatedCards.has(i);
            const decision = activationDecisions.get(i);
            
            const cardFields = decision 
              ? activationToCardFields(decision) 
              : { 
                  activationStatus: 'dormant' as const, 
                  activationTier: 'user_manual' as const, 
                  activationReasons: ['No decision available'] 
                };
            
            const card: Card = {
              id: crypto.randomUUID(),
              front: question.questionText,
              back: question.correctAnswer,
              noteId: "",
              tags: [topic.canonicalName, 'intake-quiz'],
              dueDate: timestamp,
              createdAt: timestamp,
              cardType: 'cloze',
              activationStatus: isManualActivated ? 'active' : 'dormant',
              activationTier: cardFields.activationTier,
              activationReasons: cardFields.activationReasons,
              activatedAt: isManualActivated ? timestamp : undefined,
              parentListId: null,
              listPosition: null,
              notebookTopicPageId: topicPage!.id,
              sourceBlockId: blockId,
              aiTitle: sourceItem.title,
              stability: 0,
              difficulty: 0,
              elapsedDays: 0,
              scheduledDays: 0,
              reps: 0,
              lapses: 0,
              state: 0,
              lastReview: null,
            };

            await window.api.cards.create(card);
            cardsCreatedCount++;
          }
        }
      }

      // Update source item status to curated
      await window.api.sourceItems.update(sourceItem.id, {
        status: "curated",
        updatedAt: timestamp,
      });

      toast({
        title: "Notebook Updated",
        description: `Created ${blocksCreatedCount} topic blocks and ${cardsCreatedCount} cards.`,
      });

      onComplete({
        selectedTopicIds: selectedTopics.map(t => t.id),
        blocksCreated: blocksCreatedCount,
        cardsCreated: cardsCreatedCount,
      });
    } catch (error) {
      console.error("Save complete error:", error);
      toast({
        title: "Save Failed",
        description: "Failed to persist results. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers.get(currentQuestionIndex);
  const quizProgress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const score = Array.from(answers.values()).filter(a => a.isCorrect).length;

  return (
    <>
      <div className="flex-1 overflow-y-auto p-6">
        {/* STEP 1: TOPIC SELECT */}
        {step === 'topic-select' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <Label>Suggested Topics</Label>
              <div className="flex flex-wrap gap-2">
                {suggestedTopics.length > 0 ? (
                  suggestedTopics.map((topic) => {
                    const isSelected = selectedTopics.some(t => t.canonicalName === topic);
                    return (
                      <Badge
                        key={topic}
                        variant={isSelected ? "default" : "outline"}
                        className="cursor-pointer py-1.5 px-3 hover:bg-primary/90 transition-colors capitalize"
                        onClick={() => handleTopicToggle(topic)}
                      >
                        {topic}
                        {isSelected && <Check className="ml-1 w-3 h-3" />}
                      </Badge>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground italic">No suggestions found.</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Add More Topics</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="Search or enter new topic..." 
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && customTopic.trim() && handleTopicToggle(customTopic)}
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => {
                    if (customTopic.trim()) {
                      handleTopicToggle(customTopic);
                      setCustomTopic("");
                    }
                  }}
                  disabled={!customTopic.trim() || isProcessing}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-md bg-muted/20">
                {selectedTopics.length > 0 ? (
                  selectedTopics.map((topic) => (
                    <Badge key={topic.id} variant="secondary" className="gap-1">
                      {topic.canonicalName}
                      <XCircle 
                        className="w-3 h-3 cursor-pointer opacity-60 hover:opacity-100" 
                        onClick={() => handleTopicToggle(topic.canonicalName)}
                      />
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Select topics above to continue
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: LOADING */}
        {step === 'loading' && (
          <div className="h-full flex flex-col items-center justify-center space-y-4 py-12">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-primary animate-spin" />
              <Sparkles className="w-5 h-5 text-warning absolute -top-1 -right-1 animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">AI is reading between the lines...</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Evaluating board-relevance and generating active learning questions.
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: QUIZ */}
        {step === 'quiz' && currentQuestion && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <QuizQuestionCard
              questionNumber={currentQuestionIndex + 1}
              totalQuestions={questions.length}
              question={{
                questionText: currentQuestion.questionText,
                correctAnswer: currentQuestion.correctAnswer,
                acceptableAnswers: currentQuestion.acceptableAnswers,
                sourceFact: currentQuestion.sourceFact,
                difficulty: currentQuestion.difficulty as any,
              }}
              userAnswer={userAnswer}
              onAnswerChange={setUserAnswer}
              onSkip={() => {
                const newAnswers = new Map(answers);
                newAnswers.set(currentQuestionIndex, {
                  answer: "",
                  isCorrect: false,
                  gradeResult: null,
                  timestamp: Date.now(),
                });
                setAnswers(newAnswers);
                if (currentQuestionIndex < questions.length - 1) {
                  setTimeout(() => {
                    setCurrentQuestionIndex(prev => prev + 1);
                    setUserAnswer("");
                  }, 500);
                }
              }}
              onSubmit={handleGradeAnswer}
              isSubmitted={!!currentAnswer}
              isProcessing={isProcessing}
              gradeResult={currentAnswer?.gradeResult}
            />
          </div>
        )}

        {/* STEP 4: RESULTS */}
        {step === 'results' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/20">
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{questions.length > 0 ? `${score}/${questions.length}` : "N/A"}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</div>
                </div>
                <div className="w-px bg-border my-1" />
                <div className="text-center">
                  <div className="text-2xl font-bold">{selectedTopics.length}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Topics</div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-medium text-primary">Active Learning Session Complete</span>
                <span className="text-[11px] text-muted-foreground">Ready to curate into your notebook</span>
              </div>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1">
              <Label>Flashcards to Generate</Label>
              <div className="space-y-2">
                {questions.length > 0 ? (
                  questions.map((q, idx) => {
                    const decision = activationDecisions.get(idx);
                    const isActivated = activatedCards.has(idx);
                    
                    return (
                      <div 
                        key={idx} 
                        className={cn(
                          "flex flex-col p-3 rounded-md border text-sm transition-colors mb-2",
                          isActivated ? "bg-background border-border" : "bg-muted/50 border-transparent opacity-75"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex gap-3">
                            <Brain className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <div className="line-clamp-2 pr-4 font-medium">{q.questionText}</div>
                          </div>
                          <Button
                            variant={isActivated ? "default" : "outline"}
                            size="sm"
                            className="h-7 px-2 text-[11px] shrink-0"
                            onClick={() => {
                              const newSet = new Set(activatedCards);
                              if (newSet.has(idx)) newSet.delete(idx);
                              else newSet.add(idx);
                              setActivatedCards(newSet);
                            }}
                          >
                            {isActivated ? "Active" : "Curate Only"}
                          </Button>
                        </div>
                        
                        {decision && (
                          <div className="flex flex-col gap-1 pl-7 border-l-2 border-primary/10 ml-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={cn(
                                "text-[9px] uppercase tracking-wider py-0 px-1.5 h-4 border-none font-bold",
                                decision.status === 'active' && "bg-success/15 text-success",
                                decision.status === 'suggested' && "bg-warning/15 text-warning",
                                decision.status === 'dormant' && "bg-muted text-muted-foreground"
                              )}>
                                {decision.status === 'active' ? 'AUTO-ACTIVE' :
                                 decision.status === 'suggested' ? 'SUGGESTED' : 'DORMANT'}
                              </Badge>
                              
                              {decision.reasons.length > 0 && (
                                <span className="text-[10px] text-muted-foreground italic">
                                  Why: {decision.reasons.join(", ")}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-muted-foreground italic border rounded-md">
                    No cards generated for this session.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t bg-muted/10 flex items-center justify-between">
        {step === 'quiz' ? (
          <Button variant="ghost" size="sm" onClick={() => { setIsSkipped(true); setStep('results'); }} className="text-muted-foreground">
            Skip Quiz
          </Button>
        ) : (
          <div /> 
        )}

        <div className="flex gap-2">
          {step === 'topic-select' && (
            <Button onClick={startQuiz} disabled={selectedTopics.length === 0 || isProcessing}>
              Continue to Quiz
              <ChevronRight className="ml-2 w-4 h-4" />
            </Button>
          )}

          {step === 'quiz' && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  if (currentQuestionIndex > 0) {
                    setCurrentQuestionIndex(prev => prev - 1);
                    setUserAnswer(answers.get(currentQuestionIndex - 1)?.answer || "");
                  }
                }}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="mr-2 w-4 h-4" />
                Back
              </Button>
              
              {currentQuestionIndex < questions.length - 1 ? (
                <Button 
                  size="sm"
                  onClick={() => {
                    setCurrentQuestionIndex(prev => prev + 1);
                    setUserAnswer(answers.get(currentQuestionIndex + 1)?.answer || "");
                  }}
                  disabled={!currentAnswer && currentQuestionIndex === questions.length - 1}
                >
                  Next
                  <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              ) : (
                <Button 
                  size="sm"
                  onClick={() => setStep('results')}
                  className="bg-primary hover:bg-primary/90"
                >
                  Finish Quiz
                  <Forward className="ml-2 w-4 h-4" />
                </Button>
              )}
            </div>
          )}

          {step === 'results' && (
            <Button 
              onClick={handleCompleteInternal} 
              disabled={isSaving}
              className="bg-primary hover:bg-primary/90 min-w-[120px]"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              {isSaving ? "Saving..." : "Add to Notebook"}
            </Button>
          )}
        </div>
      </div>

      {step === 'quiz' && questions.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary/20">
          <Progress value={quizProgress} className="h-full rounded-none" />
        </div>
      )}
    </>
  );
};
