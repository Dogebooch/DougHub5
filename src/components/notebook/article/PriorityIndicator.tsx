import React from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PriorityIndicatorProps {
  priorityScore: number;
  priorityReasons?: string[];
  intakeQuizResult?: "correct" | "wrong" | "skipped" | null;
  className?: string;
}

/**
 * PriorityIndicator
 *
 * Displays a colored vertical bar indicating block priority:
 * - Red (80-100): High priority - needs immediate attention
 * - Orange (50-79): Medium priority - should review
 * - Yellow (20-49): Low priority - can defer
 * - No bar (0-19): Minimal priority - mastered
 */
export function PriorityIndicator({
  priorityScore,
  priorityReasons = [],
  intakeQuizResult,
  className,
}: PriorityIndicatorProps) {
  if (priorityScore < 20) return null;

  const getPriorityColor = () => {
    if (priorityScore >= 80) return "bg-destructive";
    if (priorityScore >= 50) return "bg-warning";
    return "bg-warning/50";
  };

  const getPriorityLabel = () => {
    if (priorityScore >= 80) return "High Priority";
    if (priorityScore >= 50) return "Medium Priority";
    return "Low Priority";
  };

  const getQuizResultText = () => {
    switch (intakeQuizResult) {
      case "correct":
        return "Quiz: Correct";
      case "wrong":
        return "Quiz: Missed";
      case "skipped":
        return "Quiz: Skipped";
      default:
        return null;
    }
  };

  const tooltipContent = (
    <div className="space-y-1 max-w-xs">
      <div className="font-semibold text-xs">{getPriorityLabel()}</div>
      {getQuizResultText() && (
        <div className="text-xs text-muted-foreground">
          {getQuizResultText()}
        </div>
      )}
      {priorityReasons.length > 0 && (
        <ul className="text-xs text-muted-foreground list-disc list-inside">
          {priorityReasons.map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "absolute left-0 top-0 bottom-0 w-1 rounded-l transition-colors cursor-help",
              getPriorityColor(),
              className
            )}
            aria-label={`${getPriorityLabel()}: Score ${priorityScore}`}
          />
        </TooltipTrigger>
        <TooltipContent side="left" align="start">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
