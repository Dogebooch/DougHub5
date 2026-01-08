import React, { useState } from 'react';
import { WorthinessResult, WorthinessLevel } from '@/types/ai';
import {
  Collapsible,
  CollapsibleContent,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

interface CardWorthinessPanelProps {
  worthiness: WorthinessResult;
  /** Callback triggered when user chooses to create card despite warnings.
   * This property is provided for parent-level tracking/analytics.
   */
  onCreateAnyway?: () => void;
}

type CriterionId = 'testable' | 'oneConcept' | 'discriminative';

interface CriterionConfig {
  id: CriterionId;
  label: string;
  shortLabel: string;
  description: string;
}

const CRITERIA: CriterionConfig[] = [
  {
    id: 'testable',
    label: 'Testable',
    shortLabel: 'Test',
    description: 'Has one clear correct answer. Avoids open-ended or subjective prompts.',
  },
  {
    id: 'oneConcept',
    label: 'One Concept',
    shortLabel: '1 Fact',
    description: 'Tests exactly one retrievable fact. If multiple items exist, use a list or cloze.',
  },
  {
    id: 'discriminative',
    label: 'Discriminative',
    shortLabel: 'Discr.',
    description: 'Distinguishes from similar concepts. Avoids being too generic or vague.',
  },
];

export const CardWorthinessPanel: React.FC<CardWorthinessPanelProps> = ({
  worthiness,
  // onCreateAnyway is handled by parent for analytics
}) => {
  const [expandedId, setExpandedId] = useState<CriterionId | null>(null);

  const getStatusConfig = (level: WorthinessLevel) => {
    switch (level) {
      case 'green':
        return {
          color: 'bg-emerald-500',
          icon: CheckCircle2,
          pulse: false,
          label: 'Good',
        };
      case 'yellow':
        return {
          color: 'bg-amber-400',
          icon: AlertCircle,
          pulse: false, // Per QoL instructions: Yellow doesn't need urgency
          label: 'Warning',
        };
      case 'red':
        return {
          color: 'bg-rose-500',
          icon: XCircle,
          pulse: true,
          label: 'Critical',
        };
      default:
        return {
          color: 'bg-muted',
          icon: AlertCircle,
          pulse: false,
          label: 'Unknown',
        };
    }
  };

  const allGreen = 
    worthiness.testable === 'green' && 
    worthiness.oneConcept === 'green' && 
    worthiness.discriminative === 'green';

  const handleToggle = (id: CriterionId) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="w-full space-y-2">
      {/* Indicator Strip */}
      <div className="flex items-center justify-between p-2 px-4 rounded-lg bg-secondary/50 border border-border">
        <div className="flex gap-4 sm:gap-6">
          {CRITERIA.map((criterion) => {
            const level = worthiness[criterion.id];
            const config = getStatusConfig(level);
            const isExpanded = expandedId === criterion.id;

            return (
              <button
                key={criterion.id}
                onClick={() => handleToggle(criterion.id)}
                className={cn(
                  "group flex items-center gap-2 text-xs font-medium transition-colors hover:text-foreground",
                  isExpanded ? "text-foreground" : "text-muted-foreground"
                )}
                aria-label={`${criterion.label}: ${config.label}`}
                aria-expanded={isExpanded}
              >
                <div className="relative">
                  <div
                    className={cn(
                      "h-3 w-3 rounded-full ring-2 ring-muted ring-offset-1 ring-offset-background",
                      config.color,
                      config.pulse && "animate-pulse-subtle"
                    )}
                  />
                  {/* Subtle indicator for the selected one */}
                  {isExpanded && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </div>
                <span className="hidden sm:inline">{criterion.label}</span>
                <span className="sm:hidden">{criterion.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {allGreen && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            <span>Good card structure</span>
          </div>
        )}
      </div>

      {/* Expanded Explanation Panel */}
      {CRITERIA.map((criterion) => (
        <Collapsible
          key={criterion.id}
          open={expandedId === criterion.id}
          onOpenChange={() => {}} // Controlled by button clicks for "one at a time"
        >
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down text-sm">
            <div className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {React.createElement(
                    getStatusConfig(worthiness[criterion.id]).icon,
                    {
                      className: cn(
                        "h-3 w-3",
                        getStatusConfig(worthiness[criterion.id]).color.replace(
                          "bg-",
                          "text-"
                        )
                      ),
                    }
                  )}
                  <h4 className="font-semibold uppercase tracking-wider text-[11px] text-muted-foreground">
                    {criterion.label}
                  </h4>
                </div>
                <div
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] font-bold uppercase",
                    getStatusConfig(worthiness[criterion.id]).color,
                    "text-white shadow-sm"
                  )}
                >
                  {getStatusConfig(worthiness[criterion.id]).label}
                </div>
              </div>

              <p className="text-foreground/90 font-medium leading-tight">
                {criterion.description}
              </p>

              <div className="h-px bg-border/50 my-2" />

              <div className="flex gap-2 text-sm text-muted-foreground italic leading-relaxed">
                <blockquote className="border-l-2 border-primary/30 pl-3">
                  "{worthiness.explanations[criterion.id]}"
                </blockquote>
              </div>

              {/* Teaching moments for red status as per spec */}
              {worthiness[criterion.id] === "red" &&
                criterion.id === "testable" && (
                  <p className="text-xs text-rose-500 font-medium mt-2">
                    Tip: Rephrase as a specific question with one correct
                    answer.
                  </p>
                )}
              {worthiness[criterion.id] === "red" &&
                criterion.id === "oneConcept" && (
                  <p className="text-xs text-rose-500 font-medium mt-2">
                    Tip: Consider overlapping cloze for lists, or break into
                    multiple cards.
                  </p>
                )}
              {worthiness[criterion.id] === "red" &&
                criterion.id === "discriminative" && (
                  <p className="text-xs text-rose-500 font-medium mt-2">
                    Tip: Add context that distinguishes this from similar
                    concepts.
                  </p>
                )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
};
