import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Zap,
  Pause,
  Play,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  SkipForward,
  Loader2,
} from "lucide-react";
import { NotebookBlock, Card, ActivationStatus } from "@/types";
import { getWindowApi } from "@/lib/safeWindowApi";
import { useToast } from "@/hooks/use-toast";

interface FactDetailPopoverProps {
  block: NotebookBlock;
  children: React.ReactNode;
  onCardActivate?: (cardId: string) => void;
  onCardSuspend?: (cardId: string) => void;
  onCardDelete?: (cardId: string) => void;
}

/**
 * FactDetailPopover
 *
 * Shows complete details about a notebook block:
 * - Intake quiz result (correct/wrong/skipped)
 * - User's quiz answer if wrong
 * - AI evaluation (gaps, traps, confusion tags)
 * - All cards generated from this block
 * - Actions: Activate, Suspend, Delete cards
 */
export function FactDetailPopover({
  block,
  children,
  onCardActivate,
  onCardSuspend,
  onCardDelete,
}: FactDetailPopoverProps) {
  const [open, setOpen] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch cards for this block when popover opens
  useEffect(() => {
    if (!open) return;

    const fetchCards = async () => {
      setLoading(true);
      try {
        const api = getWindowApi();
        if (!api) return;

        const result = await api.cards.getBySiblings(block.id);
        if (result.data) {
          setCards(result.data);
        }
      } catch (error) {
        console.error("Failed to fetch block cards:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [open, block.id]);

  const getQuizResultIcon = () => {
    switch (block.intakeQuizResult) {
      case "correct":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "wrong":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "skipped":
        return <SkipForward className="h-4 w-4 text-warning" />;
      default:
        return null;
    }
  };

  const getQuizResultText = () => {
    switch (block.intakeQuizResult) {
      case "correct":
        return "You knew this";
      case "wrong":
        return "You missed this";
      case "skipped":
        return "You skipped this";
      default:
        return "Not quizzed";
    }
  };

  const handleActivate = async (cardId: string) => {
    const api = getWindowApi();
    if (!api) return;

    try {
      await api.cards.activate(cardId);
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? {
                ...c,
                activationStatus: "active" as ActivationStatus,
                activatedAt: new Date().toISOString(),
              }
            : c
        )
      );
      onCardActivate?.(cardId);
      toast({ title: "Card activated", description: "Card added to review queue" });
    } catch (error) {
      toast({ title: "Failed to activate", variant: "destructive" });
    }
  };

  const handleSuspend = async (cardId: string) => {
    const api = getWindowApi();
    if (!api) return;

    try {
      await api.cards.suspend(cardId, "user");
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? {
                ...c,
                activationStatus: "suspended" as ActivationStatus,
                suspendReason: "user" as const,
              }
            : c
        )
      );
      onCardSuspend?.(cardId);
      toast({ title: "Card suspended", description: "Card removed from reviews" });
    } catch (error) {
      toast({ title: "Failed to suspend", variant: "destructive" });
    }
  };

  const handleDelete = async (cardId: string) => {
    const api = getWindowApi();
    if (!api) return;

    try {
      await api.cards.delete(cardId);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      onCardDelete?.(cardId);
      toast({ title: "Card deleted" });
    } catch (error) {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const priorityReasons: string[] = block.priorityReasons
    ? typeof block.priorityReasons === "string"
      ? JSON.parse(block.priorityReasons)
      : block.priorityReasons
    : [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        side="right"
        align="start"
        sideOffset={8}
      >
        <div className="p-4 space-y-4">
          {/* Header: Quiz Result */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {getQuizResultIcon()}
              <span className="text-sm font-medium">{getQuizResultText()}</span>
            </div>

            {block.intakeQuizResult === "wrong" && block.intakeQuizAnswer && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                <span className="font-medium">Your answer:</span>{" "}
                {block.intakeQuizAnswer}
              </div>
            )}
          </div>

          {/* Priority */}
          {block.priorityScore !== undefined && block.priorityScore >= 20 && (
            <>
              <Separator />
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Priority Score
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      block.priorityScore >= 80
                        ? "text-destructive border-destructive/30"
                        : block.priorityScore >= 50
                          ? "text-warning border-warning/30"
                          : "text-muted-foreground"
                    )}
                  >
                    {block.priorityScore}/100
                  </Badge>
                </div>
                {priorityReasons.length > 0 && (
                  <ul className="text-xs text-muted-foreground list-disc list-inside">
                    {priorityReasons.map((reason: string, i: number) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {/* AI Evaluation */}
          {block.aiEvaluation && (
            <>
              <Separator />
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">
                  AI Analysis
                </span>

                {block.aiEvaluation.examTrapType && (
                  <div className="flex items-center gap-1.5 text-xs text-warning">
                    <AlertTriangle className="h-3 w-3" />
                    <span>
                      Exam trap: {block.aiEvaluation.examTrapType.replace(/-/g, " ")}
                    </span>
                  </div>
                )}

                {block.aiEvaluation.gaps && block.aiEvaluation.gaps.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Knowledge gaps:</span>
                    <ul className="list-disc list-inside mt-0.5">
                      {block.aiEvaluation.gaps.map((gap, i) => (
                        <li key={i}>{gap}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {block.aiEvaluation.confusionTags &&
                  block.aiEvaluation.confusionTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {block.aiEvaluation.confusionTags.map((tag, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-[10px] text-warning border-warning/30"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
              </div>
            </>
          )}

          {/* Cards Section */}
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Cards
              </span>
              {loading && (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </div>

            {!loading && cards.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                No cards generated yet
              </p>
            )}

            {!loading &&
              cards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs"
                >
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="truncate font-medium">
                      {card.front.slice(0, 40)}...
                    </p>
                    <p className="text-muted-foreground capitalize">
                      {card.activationStatus}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {card.activationStatus === "dormant" ||
                    card.activationStatus === "suggested" ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-success hover:text-success hover:bg-success/10"
                        onClick={() => handleActivate(card.id)}
                        title="Activate card"
                      >
                        <Zap className="h-3 w-3" />
                      </Button>
                    ) : card.activationStatus === "active" ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-warning hover:text-warning hover:bg-warning/10"
                        onClick={() => handleSuspend(card.id)}
                        title="Suspend card"
                      >
                        <Pause className="h-3 w-3" />
                      </Button>
                    ) : card.activationStatus === "suspended" ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-success hover:text-success hover:bg-success/10"
                        onClick={() => handleActivate(card.id)}
                        title="Reactivate card"
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                    ) : null}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(card.id)}
                      title="Delete card"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
