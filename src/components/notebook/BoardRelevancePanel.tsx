import { useState, useEffect } from "react";
import { BarChart3, Target, AlertTriangle, Loader2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RelevanceScore } from "@/types";
import { cn } from "@/lib/utils";

interface BoardRelevancePanelProps {
  topicId: string | null;
  topicTags: string[];
  sourceContent: string;
  onRelevanceComputed: (score: RelevanceScore, reason: string) => void;
}

interface BoardRelevanceData {
  questionsAttempted: number;
  correctCount: number;
  accuracy: number;
  testedConcepts: { concept: string; count: number }[];
  missedConcepts: { concept: string; sourceItemId: string }[];
}

export function BoardRelevancePanel({
  topicId,
  topicTags,
  sourceContent,
  onRelevanceComputed,
}: BoardRelevancePanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<BoardRelevanceData | null>(null);
  const [relevance, setRelevance] = useState<{
    score: RelevanceScore;
    reason: string;
  } | null>(null);

  useEffect(() => {
    if (!topicId || topicTags.length === 0) {
      setData(null);
      setRelevance(null);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const result = await window.api.insights.getBoardRelevance(topicTags);
        if (result.data) {
          setData(result.data);

          // Compute relevance score
          const { score, reason } = computeRelevance(result.data, sourceContent);
          setRelevance({ score, reason });
          onRelevanceComputed(score, reason);
        }
      } catch (err) {
        console.error("Failed to fetch board relevance:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [topicId, topicTags, sourceContent, onRelevanceComputed]);

  if (!topicId) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border bg-muted/30">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between px-4 py-3 h-auto"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Board Relevance</span>
              {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
              {relevance && <RelevanceBadge score={relevance.score} />}
            </div>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 border-t space-y-3">
            {data && data.questionsAttempted > 0 ? (
              <>
                {/* Stats */}
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground">
                    {data.questionsAttempted} Qs attempted
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span
                    className={cn(
                      data.accuracy >= 70
                        ? "text-green-600 dark:text-green-400"
                        : data.accuracy >= 50
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-destructive",
                    )}
                  >
                    {data.accuracy}% accuracy
                  </span>
                </div>
                {/* Tested Concepts */}
                {data.testedConcepts.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <Target className="h-3 w-3" /> Commonly Tested:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {data.testedConcepts.slice(0, 5).map((c) => (
                        <Badge
                          key={c.concept}
                          variant="secondary"
                          className="text-xs"
                        >
                          {c.concept} ({c.count})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {/* Missed Concepts */}
                {data.missedConcepts.length > 0 && (
                  <div className="rounded-md bg-warning/10 border border-warning/30 p-2">
                    <p className="text-xs font-medium text-warning mb-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> You missed:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {[
                        ...new Set(data.missedConcepts.map((m) => m.concept)),
                      ]
                        .slice(0, 5)
                        .map((concept) => (
                          <Badge
                            key={concept}
                            variant="outline"
                            className="text-xs border-warning/50 text-warning"
                          >
                            {concept}
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
                {/* Relevance reason */}
                {relevance && (
                  <p className="text-xs text-muted-foreground italic">
                    {relevance.reason}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No practice Q data for this topic yet.
              </p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function RelevanceBadge({ score }: { score: RelevanceScore }) {
  const config = {
    high: { label: "High Yield", className: "bg-green-600 text-white" },
    medium: { label: "Board-Tested", className: "bg-blue-600 text-white" },
    low: { label: "Low Yield", className: "bg-muted text-muted-foreground" },
    unknown: {
      label: "Unknown",
      className: "bg-warning text-warning-foreground",
    },
  };
  const { label, className } = config[score];
  return (
    <Badge className={cn("text-[10px] px-1.5 py-0", className)}>{label}</Badge>
  );
}

function computeRelevance(
  data: BoardRelevanceData,
  sourceContent: string,
): { score: RelevanceScore; reason: string } {
  const contentLower = sourceContent.toLowerCase();

  // Check missed concepts first (highest priority)
  const matchedMissed = data.missedConcepts.find((m) =>
    contentLower.includes(m.concept.toLowerCase()),
  );
  if (matchedMissed) {
    return {
      score: "high",
      reason: `Targets your weak area: "${matchedMissed.concept}"`,
    };
  }

  // Check tested concepts
  const matchedTested = data.testedConcepts.find((t) =>
    contentLower.includes(t.concept.toLowerCase()),
  );
  if (matchedTested) {
    return {
      score: "medium",
      reason: `Board-tested concept: "${matchedTested.concept}"`,
    };
  }

  // No practice Q data
  if (data.questionsAttempted === 0) {
    return { score: "unknown", reason: "No practice Q data for this topic" };
  }

  // Has Qs but no concept match
  return {
    score: "low",
    reason: "Topic has Qs but source doesn't match tested concepts",
  };
}
