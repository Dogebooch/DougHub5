import React, { useState, useEffect } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAppStore } from "@/stores/useAppStore";
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { ExamTrapType, WeakTopicSummary } from "@/types";
import { cn } from "@/lib/utils";

const trapTypeDisplayNames: Record<string, string> = {
  "qualifier-misread": "Qualifier Misread",
  "negation-blindness": "Negation Blindness",
  "age-population-skip": "Age/Population Skip",
  "absolute-terms": "Absolute Terms",
  "best-vs-correct": "Best vs Correct",
  "timeline-confusion": "Timeline Confusion",
  "look-alike-sound-alike": "Look-alike/Sound-alike",
  "incomplete-workup": "Incomplete Workup",
};

const trapTypeColors: Record<string, string> = {
  "qualifier-misread": "bg-warning",
  "negation-blindness": "bg-destructive",
  "timeline-confusion": "bg-info",
  "age-population-skip": "bg-amber-700",
  "absolute-terms": "bg-orange-600",
  "best-vs-correct": "bg-purple-600",
  "look-alike-sound-alike": "bg-indigo-600",
  "incomplete-workup": "bg-rose-600",
};

export function WeakPointsPanel() {
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem("weakPointsPanelExpanded");
    return saved === "true";
  });
  const [isLoading, setIsLoading] = useState(true);
  const [examTraps, setExamTraps] = useState<{ trapType: ExamTrapType; count: number }[]>([]);
  const [confusionPairs, setConfusionPairs] = useState<{ tag: string; count: number }[]>([]);
  const [weakTopics, setWeakTopics] = useState<WeakTopicSummary[]>([]);

  useEffect(() => {
    localStorage.setItem("weakPointsPanelExpanded", String(isExpanded));
  }, [isExpanded]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [trapsResult, confusionResult, weakResult] = await Promise.all([
          window.api.insights.getExamTrapBreakdown(),
          window.api.insights.getConfusionPairs(),
          window.api.cards.getWeakTopicSummaries(),
        ]);

        if (trapsResult.data) setExamTraps(trapsResult.data as { trapType: ExamTrapType; count: number }[]);
        if (confusionResult.data) setConfusionPairs(confusionResult.data);
        if (weakResult.data) setWeakTopics(weakResult.data.slice(0, 3));
      } catch (error) {
        console.error("Failed to fetch weak points data", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const hasData = examTraps.length > 0 || confusionPairs.length > 0 || weakTopics.length > 0;

  if (!isLoading && !hasData) {
    return (
      <div className="w-full max-w-2xl mx-auto my-4 p-8 border border-dashed rounded-lg bg-muted/20 text-center">
        <p className="text-muted-foreground text-sm flex items-center justify-center gap-2">
          <Zap className="w-4 h-4 text-muted-foreground/50" />
          No specific learning patterns detected from this session yet.
        </p>
      </div>
    );
  }

  const maxTrapCount = examTraps.length > 0 ? Math.max(...examTraps.map(t => t.count)) : 0;

  return (
    <div className="w-full max-w-2xl mx-auto my-4 overflow-hidden border rounded-lg bg-muted/30">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 transition-colors hover:bg-muted/50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <span className="font-semibold text-foreground">
              📊 Your Weak Points
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isExpanded ? (
              <>
                Collapse <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                Expand <ChevronDown className="w-4 h-4" />
              </>
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-6 border-t animate-in slide-in-from-top-2 duration-300">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* EXAM TRAPS */}
                {examTraps.length > 0 && (
                  <div className="pt-4">
                    <h3 className="mb-3 text-xs font-bold tracking-wider uppercase text-warning-foreground/70 px-2 py-0.5 rounded bg-warning/20 w-fit">
                      Exam Traps
                    </h3>
                    <div className="space-y-3">
                      {examTraps.map((trap) => {
                        const displayName = trap.trapType ? trapTypeDisplayNames[trap.trapType] || trap.trapType : "Unknown";
                        const percentage = maxTrapCount > 0 ? (trap.count / maxTrapCount) * 100 : 0;
                        const colorClass = trap.trapType ? trapTypeColors[trap.trapType] || "bg-primary" : "bg-primary";

                        return (
                          <div key={displayName} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{displayName}</span>
                              <span className="font-bold">{trap.count}</span>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn("h-full transition-all duration-1000", colorClass)}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* CONFUSION PAIRS */}
                {confusionPairs.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-xs font-bold tracking-wider uppercase text-destructive-foreground/70 px-2 py-0.5 rounded bg-destructive/20 w-fit">
                      Confusion Pairs
                    </h3>
                    <ul className="space-y-2">
                      {confusionPairs.map((pair, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <span className="mt-1 flex-shrink-0 text-destructive">•</span>
                          <span className="font-medium italic">
                            {pair.tag}
                            <span className="ml-2 text-muted-foreground not-italic">({pair.count}x)</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* WEAK TOPICS */}
                {weakTopics.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-xs font-bold tracking-wider uppercase text-info-foreground/70 px-2 py-0.5 rounded bg-info/20 w-fit">
                      Weak Topics
                    </h3>
                    <div className="space-y-2">
                      {weakTopics.map((topic) => (
                        <div key={topic.topicId} className="flex items-center justify-between p-2 rounded bg-muted/50 border border-border/50">
                          <span className="text-sm font-medium">• {topic.topicName}</span>
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-background/50 text-destructive font-bold">
                            DL {topic.avgDifficulty.toFixed(1)}
                          </span>
                        </div>
                      ))}
                      <button
                        onClick={() => setCurrentView("weak")}
                        className="w-full mt-2 text-xs text-primary hover:underline font-semibold text-center"
                      >
                        View all weak topics →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
