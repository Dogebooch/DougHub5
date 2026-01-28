import React, { useCallback } from "react";
import { Pencil, Star } from "lucide-react";
import { NotebookBlock, Card, ActivationStatus } from "@/types";
import { CalloutBlock } from "./CalloutBlock";
import { PriorityIndicator } from "./PriorityIndicator";
import { CardStatusBadge } from "./CardStatusBadge";
import { FactDetailPopover } from "./FactDetailPopover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface BlockCardSummary {
  activationStatus: ActivationStatus;
  activationReasons?: string[];
  cardCount: number;
  activatedAt?: string;
  suspendReason?: "user" | "leech" | "rotation_end" | null;
}

interface ArticleContentProps {
  blocks: NotebookBlock[];
  blockCardSummaries?: Map<string, BlockCardSummary>;
  onFootnoteClick?: (sourceItemId: string) => void;
  onBlockEdit?: (block: NotebookBlock) => void;
  onStarToggle?: (blockId: string, currentValue: boolean) => void;
  onCardStatusChange?: () => void;
  togglingBlockIds?: Set<string>;
}

/**
 * ArticleContent
 *
 * Renders notebook blocks as flowing prose without visible boundaries.
 * Blocks with calloutType render as styled callout boxes.
 * Each block shows:
 * - Priority indicator (colored bar on left)
 * - Card status badge (inline)
 * - Footnote superscript linking to its source
 * - Click opens FactDetailPopover with full details
 */
export function ArticleContent({
  blocks,
  blockCardSummaries = new Map(),
  onFootnoteClick,
  onBlockEdit,
  onStarToggle,
  onCardStatusChange,
  togglingBlockIds = new Set(),
}: ArticleContentProps) {
  const handleCardChange = useCallback(() => {
    onCardStatusChange?.();
  }, [onCardStatusChange]);

  if (!blocks || blocks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">No content yet.</p>
        <p className="text-xs mt-1">
          Add content from your Library to get started.
        </p>
      </div>
    );
  }

  return (
    <article className="prose prose-stone dark:prose-invert max-w-none">
      {blocks.map((block, index) => {
        const footnoteNum = index + 1;
        const displayContent = block.userInsight || block.content;
        const cardSummary = blockCardSummaries.get(block.id);

        // Parse priority reasons if stored as JSON string
        const priorityReasons: string[] = block.priorityReasons
          ? typeof block.priorityReasons === "string"
            ? JSON.parse(block.priorityReasons)
            : block.priorityReasons
          : [];

        // Determine callout type: explicit or auto-detected from AI evaluation
        const calloutType: "pearl" | "trap" | "caution" | null =
          block.calloutType ||
          (block.aiEvaluation?.examTrapType ? "trap" : null);

        const FootnoteSup = (
          <sup
            className="ml-1 text-primary cursor-pointer hover:underline text-xs font-medium"
            onClick={(e) => {
              e.stopPropagation();
              onFootnoteClick?.(block.sourceItemId);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onFootnoteClick?.(block.sourceItemId);
              }
            }}
          >
            {footnoteNum}
          </sup>
        );

        // Card status badge (shows inline after text)
        const StatusBadge =
          cardSummary && cardSummary.cardCount > 0 ? (
            <CardStatusBadge
              activationStatus={cardSummary.activationStatus}
              activationReasons={cardSummary.activationReasons}
              cardCount={cardSummary.cardCount}
              activatedAt={cardSummary.activatedAt}
              suspendReason={cardSummary.suspendReason}
              className="ml-2 align-middle"
            />
          ) : null;

        if (calloutType) {
          return (
            <FactDetailPopover
              key={block.id}
              block={block}
              onCardActivate={handleCardChange}
              onCardSuspend={handleCardChange}
              onCardDelete={handleCardChange}
            >
              <div className="relative pl-4 cursor-pointer">
                <PriorityIndicator
                  priorityScore={block.priorityScore ?? 0}
                  priorityReasons={priorityReasons}
                  intakeQuizResult={block.intakeQuizResult}
                />
                <CalloutBlock
                  type={calloutType}
                  onClick={onBlockEdit ? () => onBlockEdit(block) : undefined}
                >
                  <span>{displayContent}</span>
                  {FootnoteSup}
                  {StatusBadge}
                </CalloutBlock>
              </div>
            </FactDetailPopover>
          );
        }

        return (
          <FactDetailPopover
            key={block.id}
            block={block}
            onCardActivate={handleCardChange}
            onCardSuspend={handleCardChange}
            onCardDelete={handleCardChange}
          >
            <div
              className={cn(
                "group relative cursor-pointer hover:bg-muted/30 rounded-md -mx-2 px-2 py-1 mb-3 transition-colors",
                "pl-4" // Space for priority indicator
              )}
              onClick={() => onBlockEdit?.(block)}
            >
              {/* Priority Indicator */}
              <PriorityIndicator
                priorityScore={block.priorityScore ?? 0}
                priorityReasons={priorityReasons}
                intakeQuizResult={block.intakeQuizResult}
              />

              <p className="text-base leading-relaxed text-foreground/90">
                {displayContent}
                {FootnoteSup}
                {StatusBadge}
              </p>

              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onStarToggle && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={togglingBlockIds.has(block.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStarToggle(block.id, block.isHighYield);
                    }}
                    aria-label={
                      block.isHighYield
                        ? "Remove high-yield marker"
                        : "Mark as high-yield"
                    }
                  >
                    <Star
                      className={cn(
                        "h-4 w-4 transition-colors",
                        block.isHighYield
                          ? "fill-warning text-warning"
                          : "text-muted-foreground"
                      )}
                    />
                  </Button>
                )}
                {onBlockEdit && (
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </FactDetailPopover>
        );
      })}
    </article>
  );
}
