import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { List, ListImperativeAPI } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import {
  Search,
  SortDesc,
  Calendar,
  AlertTriangle,
  Layers,
  Trophy,
  Zap,
  CheckCircle2,
  Clock,
  ChevronRight,
  Pencil,
  Pause,
  Play,
  Trash2,
  Loader2,
  LayoutList,
  LayoutGrid,
  Info,
  ExternalLink,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAppStore } from "@/stores/useAppStore";
import { useToast } from "@/hooks/use-toast";
import type { CardBrowserItem, NotebookBlock } from "@/types";
import { cn } from "@/lib/utils";
import { getWindowApi } from "@/lib/safeWindowApi";
import { CardEditModal } from "./CardEditModal";

import { LucideIcon } from "lucide-react";

// Helper to handle virtual scrolling naming and AutoSizer's tricky typing
const AutoSizerComponent = AutoSizer as unknown as React.ComponentType<{
  children: (props: { height: number; width: number }) => React.ReactNode;
}>;

// Custom props passed via rowProps (exclude index, style, ariaAttributes - added by react-window)
interface CardRowData {
  cards: CardBrowserItem[];
  expandedCardId: string | null;
  expandedSiblingsCardId: string | null;
  siblingCards: CardBrowserItem[];
  onToggleExpand: (cardId: string) => void;
  onToggleSiblings: (cardId: string, sourceBlockId: string) => void;
  onEdit: (card: CardBrowserItem) => void;
  onSuspend: (card: CardBrowserItem) => void;
  onDelete: (card: CardBrowserItem) => void;
  onViewSource: (card: CardBrowserItem) => void;
  suspendingCardId: string | null;
  isCompact: boolean;
  focusedCardIndex: number | null;
  onSetFocus: (index: number) => void;
  selectedCardIds: Set<string>;
  onToggleSelect: (cardId: string) => void;
  isSelectionMode: boolean;
  // Cloze grouping props
  expandedClozeGroupIds: Set<string>;
  onToggleClozeGroup: (parentListId: string) => void;
  clozeChildCards: Map<string, CardBrowserItem[]>; // parentListId -> child cards
}

// Full props received by CardRow component
interface CardRowProps extends CardRowData {
  index: number;
  style: React.CSSProperties;
}

function CardRow({
  index,
  style,
  cards,
  expandedCardId,
  expandedSiblingsCardId,
  siblingCards,
  onToggleExpand,
  onToggleSiblings,
  onEdit,
  onSuspend,
  onDelete,
  onViewSource,
  suspendingCardId,
  isCompact,
  onSetFocus,
  selectedCardIds,
  onToggleSelect,
  isSelectionMode,
  // Cloze grouping props
  expandedClozeGroupIds,
  onToggleClozeGroup,
  clozeChildCards,
}: CardRowProps) {
  const setCurrentView = useAppStore((state) => state.setCurrentView);

  const card = cards[index];
  const isExpanded = card.id === expandedCardId;
  const isSuspending = suspendingCardId === card.id;
  const isSelected = selectedCardIds.has(card.id);
  // Suspended cards have state = 4 (FSRS convention)
  const isSuspended = card.state === 4;

  // Cloze grouping: Check if this is a parent cloze card
  const isClozeParent = 
    card.parentListId && 
    (card.listPosition === 0 || card.listPosition === null) && 
    (card.listSiblingCount ?? 0) > 1;
  const isClozeGroupExpanded = card.parentListId 
    ? expandedClozeGroupIds.has(card.parentListId) 
    : false;
  const clozeChildren = card.parentListId 
    ? clozeChildCards.get(card.parentListId) ?? [] 
    : [];

  // Status badge color mapping
  const statusConfig: Record<
    number,
    { label: string; className: string; dotClassName: string; icon: LucideIcon }
  > = {
    0: {
      label: "New",
      className: "bg-info/10 text-info border-info/20",
      dotClassName: "bg-info",
      icon: Zap,
    },
    1: {
      label: "Learning",
      className: "bg-warning/10 text-warning border-warning/20",
      dotClassName: "bg-warning",
      icon: Clock,
    },
    2: {
      label: "Review",
      className: "bg-success/10 text-success border-success/20",
      dotClassName: "bg-success",
      icon: CheckCircle2,
    },
    3: {
      label: "Relearning",
      className: "bg-destructive/10 text-destructive border-destructive/20",
      dotClassName: "bg-destructive",
      icon: AlertTriangle,
    },
    4: {
      label: "Suspended",
      className: "bg-muted/50 text-muted-foreground border-muted",
      dotClassName: "bg-muted-foreground",
      icon: Pause,
    },
  };

  const status = statusConfig[card.state] || statusConfig[0];
  const StatusIcon = status.icon;

  // Truncate front text to 60 chars for collapsed view
  const truncatedFront =
    card.front.length > 60 ? card.front.substring(0, 60) + "..." : card.front;

  const handleClick = () => {
    if (isSelectionMode) {
      onToggleSelect(card.id);
    } else {
      onSetFocus(index);
      onToggleExpand(card.id);
    }
  };

  const handleTopicClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row toggle
    if (card.notebookTopicPageId) {
      setCurrentView("notebook", card.notebookTopicPageId);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(card);
  };

  const handleSuspendClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSuspend(card);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(card);
  };

  return (
    <div
      style={style}
      onClick={handleClick}
      className={cn(
        "relative flex flex-col border-b border-border cursor-pointer group",
        "transition-all duration-150 ease-out",
        // Suspended cards: reduced opacity + dashed border for clear visual distinction
        isSuspended && !isExpanded && "opacity-55 border-l-2 border-l-muted-foreground/40 border-dashed",
        // Normal state conditions
        !isSuspended && isExpanded
          ? "bg-muted/30 border-l-2 border-l-primary"
          : !isSuspended && isSelected
          ? "bg-primary/5 border-l-2 border-l-primary"
          : !isSuspended && card.isLeech
          ? "bg-amber-500/5 hover:bg-amber-500/10 border-l-2 border-l-amber-500"
          : !isSuspended && "hover:bg-muted/50 border-l-2 border-l-transparent",
        // Suspending animation
        isSuspending && "animate-pulse"
      )}
    >
      {/* Collapsed view - always visible */}
      <div
        className={cn(
          "flex items-center gap-3 px-4",
          isCompact ? "h-[29px]" : "h-[59px]"
        )}
      >
        {/* Selection Checkbox (v2.2.5) */}
        <div
          className={cn(
            "flex items-center justify-center w-5 h-5 transition-opacity",
            isSelectionMode
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100"
          )}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(card.id)}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "h-4 w-4 border-muted-foreground/50",
              isSelected && "bg-primary border-primary"
            )}
          />
        </div>

        {/* Expand indicator */}
        <ChevronRight
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform flex-shrink-0",
            isExpanded && "rotate-90 text-primary",
            isCompact && "h-3 w-3"
          )}
        />

        <div className="flex-1 min-w-0 py-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-sm font-medium truncate transition-colors",
                isExpanded
                  ? "text-primary"
                  : "text-foreground group-hover:text-primary",
                isCompact && "text-[13px]"
              )}
            >
              {truncatedFront}
            </span>
            {card.isLeech && !isExpanded && (
              <Badge
                variant="outline"
                className={cn(
                  "bg-warning text-warning-foreground border-warning uppercase tracking-tighter",
                  isCompact ? "h-3.5 px-1 text-[8px]" : "h-5 px-1.5 text-[10px]"
                )}
              >
                Leech
              </Badge>
            )}
            {/* Cloze group indicator */}
            {isClozeParent && !isExpanded && (
              <Badge
                variant="outline"
                className={cn(
                  "bg-primary/10 text-primary border-primary/20 uppercase tracking-tighter cursor-pointer hover:bg-primary/20 transition-colors",
                  isCompact ? "h-3.5 px-1 text-[8px]" : "h-5 px-1.5 text-[10px]"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (card.parentListId) {
                    onToggleClozeGroup(card.parentListId);
                  }
                }}
              >
                {card.listSiblingCount} cloze
              </Badge>
            )}
          </div>

          {!isCompact && (
            <div className="flex items-center gap-3 mt-1">
              {card.topicName && (
                <button
                  onClick={handleTopicClick}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors truncate max-w-[150px]"
                >
                  <Layers className="w-3 h-3 shrink-0" />
                  <span className="truncate">{card.topicName}</span>
                </button>
              )}

              {card.dueDate && !isSuspended && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span>{new Date(card.dueDate).toLocaleDateString()}</span>
                </div>
              )}

              {/* Sibling count indicator for connected facts scanning */}
              {card.siblingCount > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (card.sourceBlockId) {
                      onViewSource(card);
                    }
                  }}
                  className="flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary transition-colors"
                >
                  <Layers className="w-3 h-3 shrink-0" />
                  <span className="font-medium">{card.siblingCount} connected</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Deck Visual Indicator (v2.2.4) - absolutely positioned relative to main row item */}
        {card.siblingCount > 1 && (
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 z-20"
            onClick={(e) => {
              e.stopPropagation();
              if (card.sourceBlockId) {
                onToggleSiblings(card.id, card.sourceBlockId);
              }
            }}
          >
            <div className="relative group/deck">
              <div className="w-5 h-5 rounded border border-border bg-background flex items-center justify-center relative z-10 hover:bg-muted transition-colors">
                <Layers className="w-3 h-3 text-muted-foreground group-hover/deck:text-primary" />
              </div>
              {/* Stacked effect layers */}
              <div className="absolute top-[2px] right-[-2px] w-5 h-5 border border-border rounded bg-muted/20 opacity-60 -z-10" />
              <div className="absolute top-[4px] right-[-4px] w-5 h-5 border border-border rounded bg-muted/10 opacity-40 -z-20" />
            </div>
          </div>
        )}

        {/* Hover action buttons */}
        <div
          className={cn(
            "flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0 mr-2",
            "transition-all duration-150 ease-out",
            card.siblingCount > 1 && "mr-10" // Make room for deck visual
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "text-muted-foreground hover:text-foreground",
              isCompact ? "h-6 w-6" : "h-7 w-7"
            )}
            onClick={handleEditClick}
            title="Edit card"
          >
            <Pencil className={isCompact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              isSuspended
                ? "text-success hover:text-success"
                : "text-muted-foreground hover:text-warning",
              isCompact ? "h-6 w-6" : "h-7 w-7"
            )}
            onClick={handleSuspendClick}
            disabled={isSuspending}
            title={isSuspended ? "Unsuspend card" : "Suspend card"}
          >
            {isSuspending ? (
              <Loader2
                className={cn(
                  "animate-spin",
                  isCompact ? "h-3 w-3" : "h-3.5 w-3.5"
                )}
              />
            ) : isSuspended ? (
              <Play className={isCompact ? "h-3 w-3" : "h-3.5 w-3.5"} />
            ) : (
              <Pause className={isCompact ? "h-3 w-3" : "h-3.5 w-3.5"} />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "text-muted-foreground hover:text-destructive",
              isCompact ? "h-6 w-6" : "h-7 w-7"
            )}
            onClick={handleDeleteClick}
            title="Delete card"
          >
            <Trash2 className={isCompact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          </Button>
        </div>

        {isCompact ? (
          <div
            title={status.label}
            className={cn("w-2 h-2 rounded-full shrink-0", status.dotClassName)}
          />
        ) : (
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-2 py-0.5 h-6 gap-1 shrink-0 font-semibold uppercase tracking-wider",
              status.className
            )}
          >
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </Badge>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-11 pb-4 space-y-4 animate-collapsible-down overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Front
              </Label>
              <p className="text-sm font-medium text-foreground leading-relaxed break-words whitespace-pre-wrap">
                {card.front}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Back
              </Label>
              <div className="text-sm text-foreground/80 leading-relaxed max-h-[150px] overflow-y-auto scrollbar-thin pr-2 break-words whitespace-pre-wrap">
                {card.back}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/50">
            {/* Card Metadata/Stats */}
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/50 border border-border/50">
                <span className="text-[10px] uppercase tracking-wider opacity-60">
                  Difficulty
                </span>
                <span className="font-mono font-medium text-foreground">
                  {card.difficulty.toFixed(1)}
                </span>
                {card.isLeech && (
                  <AlertTriangle className="w-3 h-3 text-amber-500 ml-0.5" />
                )}
              </div>

              {card.reps > 0 && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/50 border border-border/50">
                  <span className="text-[10px] uppercase tracking-wider opacity-60">
                    Stability
                  </span>
                  <span className="font-mono font-medium text-foreground">
                    {card.stability.toFixed(1)}d
                  </span>
                </div>
              )}
            </div>

            {card.tags && card.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 ml-2">
                {card.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-[10px] py-0.5 px-2 font-normal"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 text-[11px] text-muted-foreground ml-auto">
              {card.topicName && (
                <button
                  onClick={handleTopicClick}
                  className="flex items-center gap-1 hover:text-primary transition-colors hover:underline underline-offset-4"
                  aria-label="Jump to notebook topic page"
                >
                  <Layers className="w-3 h-3" />
                  {card.topicName}
                </button>
              )}
              {card.sourceBlockId && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewSource(card);
                    }}
                    className="h-auto p-0 flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors hover:underline underline-offset-4 font-normal"
                    aria-label="View original source content"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View Source
                  </Button>
                  <div className="flex items-center gap-1 opacity-60">
                    <span className="text-[10px]">ID:</span>
                    <code className="bg-muted px-1 rounded text-[9px] font-mono">
                      {card.sourceBlockId.slice(0, 8)}
                    </code>
                  </div>
                </>
              )}
            </div>
          </div>

          {card.isLeech && (
            <div className="flex items-start gap-2 p-3 rounded bg-amber-500/5 border border-amber-500/20 text-foreground text-[11px] leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-600 mb-0.5">
                  Leech Detected
                </p>
                <p className="text-muted-foreground italic">
                  This card may need rewriting. Consider splitting or clarifying
                  in the notebook to improve retention.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sibling cards expansion (v2.2.4) - Rendered as nested indented rows below parent */}
      {expandedSiblingsCardId === card.id && siblingCards.length > 0 && (
        <div className="ml-8 border-l-2 border-primary/20 pl-4 py-3 space-y-1.5 mb-3 animate-in fade-in slide-in-from-left-3 duration-300">
          <div className="flex items-center gap-2 mb-2 px-2">
            <Layers className="w-3 h-3 text-primary/70" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
              {siblingCards.length + 1} cards from this block
            </span>
          </div>

          <div className="space-y-1">
            {siblingCards.map((sibling, idx) => (
              <div
                key={sibling.id}
                className="flex items-center gap-3 p-2.5 rounded-md hover:bg-primary/5 transition-all cursor-pointer group/sibling border border-transparent hover:border-primary/10"
                onClick={(e) => {
                  e.stopPropagation();
                  const siblingIndex = cards.findIndex(
                    (c) => c.id === sibling.id
                  );
                  if (siblingIndex !== -1) {
                    onSetFocus(siblingIndex);
                    onToggleExpand(sibling.id);
                  }
                }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex flex-col items-center shrink-0">
                    <span className="text-[9px] font-mono text-muted-foreground/60 leading-none">
                      {idx + 1} of {card.siblingCount}
                    </span>
                  </div>
                  <span className="text-xs font-medium truncate text-foreground/90">
                    {sibling.front}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className="text-[8px] h-4 px-1 uppercase tracking-tighter font-semibold opacity-70"
                  >
                    {sibling.state === 0
                      ? "New"
                      : sibling.state === 4
                      ? "Susp"
                      : "Study"}
                  </Badge>
                  <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover/sibling:text-primary group-hover/sibling:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cloze group expansion (v2.3) - Rendered as indented child cards */}
      {isClozeGroupExpanded && clozeChildren.length > 0 && (
        <div className="ml-8 border-l-2 border-primary/30 pl-4 py-3 space-y-1.5 mb-3 animate-in fade-in slide-in-from-left-3 duration-300">
          <div className="flex items-center gap-2 mb-2 px-2">
            <Layers className="w-3 h-3 text-primary/70" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
              {card.listSiblingCount} cloze cards in group
            </span>
          </div>

          <div className="space-y-1">
            {clozeChildren.map((child, idx) => (
              <div
                key={child.id}
                className="flex items-center gap-3 p-2.5 rounded-md hover:bg-primary/5 transition-all cursor-pointer group/cloze border border-transparent hover:border-primary/10"
                onClick={(e) => {
                  e.stopPropagation();
                  const childIndex = cards.findIndex((c) => c.id === child.id);
                  if (childIndex !== -1) {
                    onSetFocus(childIndex);
                    onToggleExpand(child.id);
                  }
                }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex flex-col items-center shrink-0">
                    <span className="text-[9px] font-mono text-muted-foreground/60 leading-none">
                      #{idx + 2}
                    </span>
                  </div>
                  <span className="text-xs font-medium truncate text-foreground/90">
                    {child.front.replace(/\{\{c\d+::/g, "").replace(/\}\}/g, "")}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className="text-[8px] h-4 px-1 uppercase tracking-tighter font-semibold opacity-70"
                  >
                    {child.state === 0
                      ? "New"
                      : child.state === 4
                      ? "Susp"
                      : "Study"}
                  </Badge>
                  <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover/cloze:text-primary group-hover/cloze:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CardPreviewPane({ card }: { card: CardBrowserItem | null }) {
  if (!card) {
    return (
      <div className="h-[120px] border-t bg-surface-elevated/50 flex items-center justify-center text-muted-foreground text-sm">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4" />
          <span>Select a card to preview</span>
        </div>
      </div>
    );
  }

  const isSuspended = card.state === 4;
  const truncatedFront =
    card.front.length > 120 ? card.front.substring(0, 120) + "..." : card.front;
  const truncatedBack =
    card.back.length > 120 ? card.back.substring(0, 120) + "..." : card.back;

  return (
    <div className={cn(
      "h-[130px] border-t bg-surface-elevated flex flex-col p-4 gap-3 overflow-hidden shadow-inner",
      "transition-all duration-150",
      isSuspended && "opacity-60 bg-surface-elevated/50"
    )}>
      <div className="flex-1 flex gap-4 min-w-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-primary/70 uppercase tracking-widest">
              Question
            </span>
            {isSuspended && (
              <Badge variant="outline" className="h-4 px-1.5 text-[8px] uppercase tracking-wider bg-muted/50 text-muted-foreground border-dashed">
                Suspended
              </Badge>
            )}
            {card.siblingCount > 1 && (
              <Badge variant="outline" className="h-4 px-1.5 text-[8px] uppercase tracking-wider bg-primary/10 text-primary border-primary/20">
                {card.siblingCount} connected
              </Badge>
            )}
          </div>
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-relaxed whitespace-pre-wrap italic">
            {truncatedFront}
          </p>
        </div>
        <div className="flex-1 min-w-0 border-l border-border/30 pl-4">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">
            Answer Preview
          </span>
          <p className="text-xs text-foreground/80 line-clamp-3 leading-relaxed whitespace-pre-wrap">
            {truncatedBack}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6 pt-2 border-t border-border/20">
        <div
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
          title="FSRS Difficulty"
        >
          <Zap className="w-3.5 h-3.5 text-warning" />
          <span className="font-medium text-foreground">
            {(card.difficulty * 10).toFixed(1)}%
          </span>
          <span>Difficulty</span>
        </div>

        <div
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
          title="Scheduled Due Date"
        >
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span className="font-medium text-foreground">
            {card.dueDate ? new Date(card.dueDate).toLocaleDateString() : "New"}
          </span>
          <span>Due</span>
        </div>

        <div
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
          title="Learning Lapses"
        >
          <AlertTriangle
            className={cn(
              "w-3.5 h-3.5",
              card.lapses > 5 ? "text-destructive" : "text-muted-foreground"
            )}
          />
          <span className="font-medium text-foreground">{card.lapses}</span>
          <span>Lapses</span>
        </div>

        <div
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
          title="Last Learned"
        >
          <Clock className="w-3.5 h-3.5 text-info" />
          <span className="font-medium text-foreground">
            {card.lastReview
              ? new Date(card.lastReview).toLocaleDateString()
              : "Never"}
          </span>
          <span>Last Learned</span>
        </div>
      </div>
    </div>
  );
}

export function CardBrowserView() {
  const [cards, setCards] = useState<CardBrowserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"due" | "leeches" | "all">("all");
  const [sortField, setSortField] = useState<
    "dueDate" | "createdAt" | "difficulty" | "lastReview"
  >("dueDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [compactMode, setCompactMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("cardBrowser.compactMode");
    return saved ? JSON.parse(saved) : false;
  });

  // Expand state, focus state, and list ref
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [expandedSiblingsCardId, setExpandedSiblingsCardId] = useState<
    string | null
  >(null);
  const [siblingCards, setSiblingCards] = useState<CardBrowserItem[]>([]);
  const [focusedCardIndex, setFocusedCardIndex] = useState<number | null>(null);
  const listRef = useRef<ListImperativeAPI>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Source drawer state
  const [sourceDrawerOpen, setSourceDrawerOpen] = useState(false);
  const [sourceDrawerLoading, setSourceDrawerLoading] = useState(false);
  const [sourceBlockData, setSourceBlockData] = useState<{
    block: NotebookBlock | null;
    cards: CardBrowserItem[];
  } | null>(null);

  // Action modal/dialog state
  const [editingCard, setEditingCard] = useState<CardBrowserItem | null>(null);
  const [deletingCard, setDeletingCard] = useState<CardBrowserItem | null>(
    null
  );
  const [suspendingCardId, setSuspendingCardId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isMounted = useRef(true);

  // Selection state
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(
    new Set()
  );
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Cloze grouping state
  const [expandedClozeGroupIds, setExpandedClozeGroupIds] = useState<Set<string>>(
    new Set()
  );
  const [clozeChildCards, setClozeChildCards] = useState<Map<string, CardBrowserItem[]>>(
    new Map()
  );

  const getBrowserList = useAppStore((state) => state.getBrowserList);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Persist compact mode preference
  useEffect(() => {
    localStorage.setItem(
      "cardBrowser.compactMode",
      JSON.stringify(compactMode)
    );
  }, [compactMode]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Ref to track method stability
  const getBrowserListRef = useRef(getBrowserList);
  useEffect(() => {
    getBrowserListRef.current = getBrowserList;
    // Log if getBrowserList identity changes (debugging infinite loop)
    console.log("[CardBrowser] getBrowserList identity updated");
  }, [getBrowserList]);

  // Rate limiting to prevent infinite loops
  const lastFetchTime = useRef(0);
  const fetchCount = useRef(0);

  const fetchCards = useCallback(async () => {
    if (!isMounted.current) return;

    const now = Date.now();
    if (now - lastFetchTime.current < 1000) {
      fetchCount.current++;
      if (fetchCount.current > 3) {
        console.warn("[CardBrowser] Infinite loop detected? Throttle active.");
        return;
      }
    } else {
      fetchCount.current = 0;
    }
    lastFetchTime.current = now;

    console.log("[CardBrowser] fetchCards started", { activeTab, debouncedSearch, sortField, sortDirection });
    setIsLoading(true);
    const start = Date.now();
    try {
      const api = getWindowApi();
      if (!api) {
        console.warn("[CardBrowser] window.api unavailable - fetch skipped");
        if (isMounted.current) {
             setCards([]); // Clear cards on browser
             setIsLoading(false);
        }
        return;
      }

      const filters: { leechesOnly?: boolean; search?: string } = {};

      if (activeTab === "leeches") {
        filters.leechesOnly = true;
      }
      if (debouncedSearch.trim()) {
        filters.search = debouncedSearch.trim();
      }

      console.log("[CardBrowser] Calling getBrowserList with filters:", filters);
      // Use ref to ensure stability
      const result = await getBrowserListRef.current(filters, {
        field: sortField,
        direction: sortDirection,
      });
      
      console.log(`[CardBrowser] getBrowserList returned ${result?.length || 0} cards in ${Date.now() - start}ms`);
      
      if (isMounted.current) {
        setCards(result || []);
        setError(null);
      }
    } catch (err: any) {
      console.error("[CardBrowser] Failed to fetch cards:", err);
      if (isMounted.current) {
        setError(err.message || String(err));
      }
    } finally {
      console.log(`[CardBrowser] fetchCards finished total time: ${Date.now() - start}ms`);
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [activeTab, debouncedSearch, sortField, sortDirection]); // Removed getBrowserList from deps

  useEffect(() => {
    // Debug: trace who is triggering this effect
    // console.trace("[CardBrowser] Triggering fetchCards effect");
    fetchCards();
  }, [fetchCards]);

  const filteredCards = useMemo(() => {
    let result = cards;

    // Filter by due date if on "due" tab
    if (activeTab === "due") {
      const today = new Date().toISOString().split("T")[0];
      result = result.filter((card) => card.dueDate && card.dueDate <= today);
    }

    // Hide child cloze cards (cards with parentListId and listPosition > 0)
    // Only show parent cloze cards (listPosition = 0 or null) in the main list
    result = result.filter((card) => {
      if (!card.parentListId) return true; // Non-cloze cards
      if (card.listPosition === null || card.listPosition === 0) return true; // Parent cloze
      return false; // Hide child cloze cards
    });

    return result;
  }, [cards, activeTab]);

  // Height calculator for VariableSizeList
  const getItemSize = useCallback(
    (index: number) => {
      const card = filteredCards[index];
      if (!card) return 60;

      let height = compactMode ? 30 : 60;

      // Add expanded details height
      if (card.id === expandedCardId) {
        height = card.isLeech ? 280 : 220;
      }

      // Add siblings list height if expanded (even if parent not expanded)
      if (card.id === expandedSiblingsCardId && siblingCards.length > 0) {
        // base height (from above) + sibling header + each sibling row + padding
        const siblingHeight = siblingCards.length * 36 + 30;
        height += siblingHeight;
      }

      // Add cloze group expansion height
      if (card.parentListId && expandedClozeGroupIds.has(card.parentListId)) {
        const childCount = clozeChildCards.get(card.parentListId)?.length ?? 0;
        if (childCount > 0) {
          // header + each child row + padding
          const clozeHeight = childCount * 44 + 40;
          height += clozeHeight;
        }
      }

      return height;
    },
    [
      filteredCards,
      expandedCardId,
      expandedSiblingsCardId,
      siblingCards,
      compactMode,
      expandedClozeGroupIds,
      clozeChildCards,
    ]
  );

  // Reset virtual list cache when row heights change due to expansion
  useEffect(() => {
    if (listRef.current) {
      (listRef.current as any).resetAfterIndex(0);
    }
  }, [
    expandedCardId,
    expandedSiblingsCardId,
    siblingCards,
    expandedClozeGroupIds,
    clozeChildCards,
    compactMode,
  ]);

  const handleToggleExpand = useCallback((cardId: string) => {
    setExpandedCardId((prev) => (prev === cardId ? null : cardId));

    // Auto-collapse siblings when toggling or switching card expansion
    setExpandedSiblingsCardId(null);
    setSiblingCards([]);
  }, []);

  const handleToggleSiblings = useCallback(
    async (cardId: string, sourceBlockId: string) => {
      if (expandedSiblingsCardId === cardId) {
        setExpandedSiblingsCardId(null);
        setSiblingCards([]);
        return;
      }

      try {
        const api = getWindowApi();
        if (!api) {
          toast({
            title: "Unavailable",
            description: "Card details require the Electron bridge.",
            variant: "destructive",
          });
          return;
        }

        const result = await api.cards.getBySiblings(sourceBlockId);
        if (result.data) {
          // Filter out the current card to only show TRUE siblings
          const actualSiblings = result.data.filter((c) => c.id !== cardId);
          setSiblingCards(actualSiblings);
          setExpandedSiblingsCardId(cardId);
        }
      } catch (error) {
        console.error("Failed to fetch sibling cards:", error);
        toast({
          title: "Error",
          description: "Failed to load sibling cards.",
          variant: "destructive",
        });
      }
    },
    [expandedSiblingsCardId, toast]
  );

  const handleSetFocus = useCallback((index: number) => {
    setFocusedCardIndex(index);
  }, []);

  // Selection handlers
  const handleToggleSelect = useCallback((cardId: string) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
        setIsSelectionMode(true);
      }
      if (next.size === 0) {
        setIsSelectionMode(false);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCardIds(new Set());
    setIsSelectionMode(false);
  }, []);

  // Cloze group toggle handler
  const handleToggleClozeGroup = useCallback((parentListId: string) => {
    setExpandedClozeGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(parentListId)) {
        next.delete(parentListId);
      } else {
        next.add(parentListId);
        // Load child cards for this group from the already-fetched cards
        const childCards = cards.filter(
          (c) => c.parentListId === parentListId && (c.listPosition ?? 0) > 0
        );
        setClozeChildCards((prevMap) => {
          const nextMap = new Map(prevMap);
          nextMap.set(parentListId, childCards);
          return nextMap;
        });
      }
      return next;
    });
  }, [cards]);

  const handleBatchSuspend = useCallback(async () => {
    if (selectedCardIds.size === 0) return;

    setIsBatchProcessing(true);
    const selectedCards = cards.filter((c) => selectedCardIds.has(c.id));
    const anyUnsuspended = selectedCards.some((c) => c.state !== 4);
    const newState = anyUnsuspended ? 4 : 2; // Suspend all or Unsuspend all

    try {
      const api = getWindowApi();
      if (!api) {
        toast({
          title: "Unavailable",
          description: "Cannot update cards without the Electron bridge.",
          variant: "destructive",
        });
        return;
      }

      // Process sequentially as per clarification
      for (const cardId of selectedCardIds) {
        await api.cards.update(cardId, { state: newState });
      }

      toast({
        title: anyUnsuspended ? "Cards suspended" : "Cards unsuspended",
        description: `Successfully updated ${selectedCardIds.size} cards.`,
      });
      clearSelection();
      fetchCards();
    } catch (error) {
      console.error("Batch suspend failed:", error);
      toast({
        title: "Batch update failed",
        description: "An error occurred during the batch operation.",
        variant: "destructive",
      });
    } finally {
      setIsBatchProcessing(false);
    }
  }, [selectedCardIds, cards, fetchCards, toast, clearSelection]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedCardIds.size === 0) return;

    setIsBatchProcessing(true);
    try {
      const api = getWindowApi();
      if (!api) {
        toast({
          title: "Unavailable",
          description: "Cannot delete cards without the Electron bridge.",
          variant: "destructive",
        });
        return;
      }

      for (const cardId of selectedCardIds) {
        await api.cards.remove(cardId);
      }

      toast({
        title: "Cards deleted",
        description: `Successfully deleted ${selectedCardIds.size} cards.`,
      });
      clearSelection();
      fetchCards();
    } catch (error) {
      console.error("Batch delete failed:", error);
      toast({
        title: "Batch delete failed",
        description: "An error occurred during the batch operation.",
        variant: "destructive",
      });
    } finally {
      setIsBatchProcessing(false);
    }
  }, [selectedCardIds, fetchCards, toast, clearSelection]);

  const handleViewSource = useCallback(
    async (card: CardBrowserItem) => {
      if (!card.sourceBlockId) return;

      setSourceDrawerOpen(true);
      setSourceDrawerLoading(true);
      setSourceBlockData(null); // Clear previous content

      try {
        const api = getWindowApi();
        if (!api) {
          toast({
            title: "Unavailable",
            description: "Cannot load source without the Electron bridge.",
            variant: "destructive",
          });
          return;
        }

        // Fetch block content and sibling cards in parallel
        const [blockResult, siblingsResult] = await Promise.all([
          api.notebookBlocks.getById(card.sourceBlockId),
          api.cards.getBySiblings(card.sourceBlockId),
        ]);

        setSourceBlockData({
          block: blockResult.data || null,
          cards: siblingsResult.data || [],
        });
      } catch (error) {
        console.error("Failed to fetch source block:", error);
        toast({
          title: "Error",
          description: "Failed to load source block content.",
          variant: "destructive",
        });
      } finally {
        setSourceDrawerLoading(false);
      }
    },
    [toast]
  );

  const focusedCard = useMemo(() => {
    if (
      focusedCardIndex === null ||
      focusedCardIndex < 0 ||
      focusedCardIndex >= filteredCards.length
    ) {
      return null;
    }
    return filteredCards[focusedCardIndex];
  }, [focusedCardIndex, filteredCards]);
  // Action handlers
  const handleEdit = useCallback((card: CardBrowserItem) => {
    setEditingCard(card);
  }, []);

  const handleSuspend = useCallback(
    async (card: CardBrowserItem) => {
      setSuspendingCardId(card.id);
      const isSuspended = card.state === 4;
      // Toggle between suspended (4) and the card's previous state
      // For simplicity, unsuspending goes back to Review state (2)
      const newState = isSuspended ? 2 : 4;

      try {
        const api = getWindowApi();
        if (!api) {
          toast({
            title: "Unavailable",
            description: "Cannot update cards without the Electron bridge.",
            variant: "destructive",
          });
          return;
        }

        const result = await api.cards.update(card.id, {
          state: newState,
        });
        if (result.error) {
          toast({
            title: "Failed to update card",
            description: result.error,
            variant: "destructive",
          });
        } else {
          toast({
            title: isSuspended ? "Card unsuspended" : "Card suspended",
            description: isSuspended
              ? "The card will appear in your learning sessions again."
              : "The card has been removed from learning sessions.",
          });
          // Refresh the list
          fetchCards();
        }
      } catch (err) {
        toast({
          title: "Error",
          description: "An unexpected error occurred.",
          variant: "destructive",
        });
      } finally {
        setSuspendingCardId(null);
      }
    },
    [fetchCards, toast]
  );

  const handleDelete = useCallback((card: CardBrowserItem) => {
    setDeletingCard(card);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingCard) return;

    setIsDeleting(true);
    try {
      const api = getWindowApi();
      if (!api) {
        toast({
          title: "Unavailable",
          description: "Cannot delete cards without the Electron bridge.",
          variant: "destructive",
        });
        return;
      }

      const result = await api.cards.remove(deletingCard.id);
      if (result.error) {
        toast({
          title: "Failed to delete card",
          description: result.error,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Card deleted",
          description: "The card has been permanently removed.",
        });
        // Clear expanded if we deleted the expanded card
        if (expandedCardId === deletingCard.id) {
          setExpandedCardId(null);
        }
        fetchCards();
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeletingCard(null);
    }
  }, [deletingCard, expandedCardId, fetchCards, toast]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Compact mode toggle: Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        setCompactMode((prev) => !prev);
        return;
      }

      // Ignore if typing in an input/textarea
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      // / (forward slash): Focus search input
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // ? or Shift+/: Show keyboard shortcuts help
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShowShortcutsHelp((prev) => !prev);
        return;
      }

      // E: Edit focused card
      if (
        e.key.toLowerCase() === "e" &&
        focusedCardIndex !== null &&
        filteredCards[focusedCardIndex]
      ) {
        e.preventDefault();
        handleEdit(filteredCards[focusedCardIndex]);
        return;
      }

      // S: Suspend/unsuspend focused card
      if (
        e.key.toLowerCase() === "s" &&
        focusedCardIndex !== null &&
        filteredCards[focusedCardIndex]
      ) {
        e.preventDefault();
        handleSuspend(filteredCards[focusedCardIndex]);
        return;
      }

      // Delete/Backspace: Delete focused card (opens confirmation)
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        focusedCardIndex !== null &&
        filteredCards[focusedCardIndex]
      ) {
        e.preventDefault();
        handleDelete(filteredCards[focusedCardIndex]);
        return;
      }

      // L: Switch to Leeches tab
      if (e.key.toLowerCase() === "l") {
        e.preventDefault();
        setActiveTab("leeches");
        return;
      }

      // 1/2/3: Switch filter tabs (1=Due, 2=Leeches, 3=All)
      if (e.key === "1") {
        e.preventDefault();
        setActiveTab("due");
        return;
      }
      if (e.key === "2") {
        e.preventDefault();
        setActiveTab("leeches");
        return;
      }
      if (e.key === "3") {
        e.preventDefault();
        setActiveTab("all");
        return;
      }

      // N: Next leech card (only in leeches tab)
      if (
        e.key.toLowerCase() === "n" &&
        activeTab === "leeches" &&
        filteredCards.length > 0
      ) {
        e.preventDefault();
        const currentIdx = focusedCardIndex ?? -1;
        const nextIdx = (currentIdx + 1) % filteredCards.length; // Wraparound
        setFocusedCardIndex(nextIdx);
        setExpandedCardId(filteredCards[nextIdx].id);
        listRef.current?.scrollToRow({ index: nextIdx, align: "smart" });
        return;
      }

      // P: Previous leech card (only in leeches tab)
      if (
        e.key.toLowerCase() === "p" &&
        activeTab === "leeches" &&
        filteredCards.length > 0
      ) {
        e.preventDefault();
        const currentIdx = focusedCardIndex ?? 0;
        const prevIdx =
          currentIdx <= 0 ? filteredCards.length - 1 : currentIdx - 1; // Wraparound
        setFocusedCardIndex(prevIdx);
        setExpandedCardId(filteredCards[prevIdx].id);
        listRef.current?.scrollToRow({ index: prevIdx, align: "smart" });
        return;
      }

      // Ctrl+A: Select all visible cards (v2.2.5)
      if (e.ctrlKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        if (filteredCards.length > 0) {
          const allIds = new Set(filteredCards.map((c) => c.id));
          setSelectedCardIds(allIds);
          setIsSelectionMode(true);
        }
        return;
      }

      if (!filteredCards.length) return;

      const currentIndex = focusedCardIndex ?? -1;

      switch (e.key) {
        case "Escape": {
          // Clear selection first, then focus
          e.preventDefault();
          if (selectedCardIds.size > 0) {
            clearSelection();
          } else {
            setFocusedCardIndex(null);
            setExpandedCardId(null);
          }
          break;
        }

        case "ArrowRight": {
          if (isSelectionMode) return;
          // Expand focused card
          if (currentIndex >= 0 && filteredCards[currentIndex]) {
            setExpandedCardId(filteredCards[currentIndex].id);
          } else if (filteredCards[0]) {
            // Focus and expand first if nothing focused
            setFocusedCardIndex(0);
            setExpandedCardId(filteredCards[0].id);
            listRef.current?.scrollToRow({ index: 0, align: "smart" });
          }
          break;
        }

        case "ArrowLeft": {
          if (isSelectionMode) return;
          // Collapse current
          setExpandedCardId(null);
          break;
        }

        case "ArrowDown": {
          e.preventDefault();
          const nextIndex =
            currentIndex === -1
              ? 0
              : Math.min(currentIndex + 1, filteredCards.length - 1);

          if (nextIndex >= 0) {
            setFocusedCardIndex(nextIndex);
            if (e.shiftKey) {
              handleToggleSelect(filteredCards[nextIndex].id);
            } else if (!isSelectionMode) {
              setExpandedCardId(filteredCards[nextIndex].id);
            }
            listRef.current?.scrollToRow({ index: nextIndex, align: "smart" });
          }
          break;
        }

        case "ArrowUp": {
          e.preventDefault();
          const prevIndex =
            currentIndex === -1 ? 0 : Math.max(currentIndex - 1, 0);

          if (prevIndex >= 0) {
            setFocusedCardIndex(prevIndex);
            if (e.shiftKey) {
              handleToggleSelect(filteredCards[prevIndex].id);
            } else if (!isSelectionMode) {
              setExpandedCardId(filteredCards[prevIndex].id);
            }
            listRef.current?.scrollToRow({ index: prevIndex, align: "smart" });
          }
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    filteredCards,
    focusedCardIndex,
    compactMode,
    selectedCardIds,
    isSelectionMode,
    handleToggleSelect,
    clearSelection,
    activeTab,
    handleEdit,
    handleSuspend,
    handleDelete,
  ]);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header Toolbar */}
      <div className="p-4 space-y-4 border-b bg-surface-base">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-surface-elevated border-border ring-offset-background"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground"
              onClick={() => setCompactMode(!compactMode)}
              title={
                compactMode
                  ? "Switch to normal view"
                  : "Switch to compact view (Ctrl+Shift+C)"
              }
            >
              {compactMode ? (
                <LayoutGrid className="h-4 w-4" />
              ) : (
                <LayoutList className="h-4 w-4" />
              )}
            </Button>

            <Select
              value={`${sortField}-${sortDirection}`}
              onValueChange={(val) => {
                const parts = val.split("-");
                const field = parts[0] as
                  | "dueDate"
                  | "createdAt"
                  | "difficulty"
                  | "lastReview";
                const dir = parts[1] as "asc" | "desc";
                setSortField(field);
                setSortDirection(dir);
              }}
            >
              <SelectTrigger className="w-[180px] h-9 bg-surface-elevated border-border">
                <SortDesc className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dueDate-asc">
                  Due Date (Earlier First)
                </SelectItem>
                <SelectItem value="dueDate-desc">
                  Due Date (Later First)
                </SelectItem>
                <SelectItem value="createdAt-desc">
                  Created (Newest First)
                </SelectItem>
                <SelectItem value="createdAt-asc">
                  Created (Oldest First)
                </SelectItem>
                <SelectItem value="difficulty-desc">
                  Difficulty (Hardest First)
                </SelectItem>
                <SelectItem value="difficulty-asc">
                  Difficulty (Easiest First)
                </SelectItem>
                <SelectItem value="lastReview-desc">Last Learned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "due" | "leeches" | "all")}
          className="w-full"
        >
          <TabsList className="bg-surface-elevated border-border h-9">
            <TabsTrigger value="all" className="text-xs">
              All Cards
            </TabsTrigger>
            <TabsTrigger value="due" className="text-xs">
              Due
              {activeTab !== "due" &&
                cards.some(
                  (c) =>
                    c.dueDate &&
                    c.dueDate <= new Date().toISOString().split("T")[0],
                ) && (
                  <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
            </TabsTrigger>
            <TabsTrigger value="leeches" className="text-xs">
              Leeches
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-background/50 relative">
        {error ? (
           <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
             <div className="p-6 max-w-md w-full bg-destructive/10 border border-destructive/20 rounded-lg shadow-lg text-destructive text-center space-y-2">
               <AlertTriangle className="w-10 h-10 mx-auto" />
               <h3 className="font-semibold text-lg">Failed to load cards</h3>
               <p className="text-sm opacity-90 font-mono break-all">{error}</p>
               <button
                 onClick={() => fetchCards()}
                 className="px-4 py-2 bg-background border border-destructive/30 hover:bg-destructive/10 rounded text-sm transition-colors mt-4"
               >
                 Retry
               </button>
             </div>
           </div>
        ) : isLoading ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm animate-pulse-subtle">
              Loading your cards...
            </p>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
            {activeTab === "leeches" ? (
              <div className="space-y-4 max-w-xs">
                <div className="mx-auto w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-success" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Great job! No leeches to learn.
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    Your retention is high and you've addressed your most
                    difficult concepts.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-xs">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                  <Search className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    No cards found
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {debouncedSearch
                      ? "No cards match your current search or filters. Try adjusting your criteria."
                      : "You haven't created any cards for this view yet. Capture concepts in your Notebook to generate cards."}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <AutoSizerComponent>
            {({ height, width }: { height: number; width: number }) => (
              <List<CardRowData>
                listRef={listRef}
                style={{ height: height || 600, width: width || 800 }}
                rowCount={filteredCards.length}
                rowHeight={(idx) => getItemSize(idx)}
                rowComponent={CardRow}
                rowProps={{
                  cards: filteredCards,
                  expandedCardId,
                  expandedSiblingsCardId,
                  siblingCards,
                  onToggleExpand: handleToggleExpand,
                  onToggleSiblings: handleToggleSiblings,
                  onEdit: handleEdit,
                  onSuspend: handleSuspend,
                  onDelete: handleDelete,
                  onViewSource: handleViewSource,
                  suspendingCardId,
                  isCompact: compactMode,
                  focusedCardIndex,
                  onSetFocus: handleSetFocus,
                  selectedCardIds,
                  onToggleSelect: handleToggleSelect,
                  isSelectionMode,
                  // Cloze grouping props
                  expandedClozeGroupIds,
                  onToggleClozeGroup: handleToggleClozeGroup,
                  clozeChildCards,
                }}
                className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
              />
            )}
          </AutoSizerComponent>
        )}

        {/* Batch Actions Bar (v2.2.5) */}
        {selectedCardIds.size > 0 && (
          <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-background border-2 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 min-w-[450px] justify-between border-primary/20 bg-background/95 backdrop-blur-sm">
              <div className="flex items-center gap-3 border-r pr-6 border-border">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {selectedCardIds.size}
                </span>
                <span className="text-sm font-medium whitespace-nowrap">
                  {selectedCardIds.size === 1
                    ? "card selected"
                    : "cards selected"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearSelection}
                  className="text-muted-foreground hover:text-foreground rounded-full h-9"
                  disabled={isBatchProcessing}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBatchSuspend}
                  className="rounded-full h-9 px-4 border-primary/20 hover:border-primary/40"
                  disabled={isBatchProcessing}
                >
                  {isBatchProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : cards
                      .filter((c) => selectedCardIds.has(c.id))
                      .some((c) => c.state !== 4) ? (
                    <Pause className="h-4 w-4 mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {cards
                    .filter((c) => selectedCardIds.has(c.id))
                    .some((c) => c.state !== 4)
                    ? "Suspend All"
                    : "Unsuspend All"}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="rounded-full h-9 px-4"
                      disabled={isBatchProcessing}
                    >
                      {isBatchProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Delete All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Delete {selectedCardIds.size} cards?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. These cards will be
                        permanently removed from your database.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleBatchDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete Permanently
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview Pane */}
      <CardPreviewPane card={focusedCard} />

      {/* Footer statistics */}
      <div className="px-4 py-2 border-t bg-surface-base flex justify-between items-center text-[10px] text-muted-foreground uppercase tracking-wider">
        <div className="flex gap-4">
          <span>Total: {cards.length}</span>
          <span>Filtered: {filteredCards.length}</span>
          {focusedCardIndex !== null && (
            <span className="text-primary">
              Selected: {focusedCardIndex + 1}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[9px] normal-case tracking-normal opacity-70">
          <span>
            <kbd className="px-1 py-0.5 rounded bg-muted border text-[8px]">
              /
            </kbd>{" "}
            Search
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-muted border text-[8px]">
              E
            </kbd>{" "}
            Edit
          </span>
          <span>
            <kbd className="px-1 py-0.5 rounded bg-muted border text-[8px]">
              S
            </kbd>{" "}
            Suspend
          </span>
          <div className="flex items-center gap-0.5">
            <kbd className="px-1 py-0.5 rounded bg-muted border text-[8px]">
              1
            </kbd>
            <kbd className="px-1 py-0.5 rounded bg-muted border text-[8px]">
              2
            </kbd>
            <kbd className="px-1 py-0.5 rounded bg-muted border text-[8px]">
              3
            </kbd>
            <span className="ml-1">Tabs</span>
          </div>

          <Popover open={showShortcutsHelp} onOpenChange={setShowShortcutsHelp}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 hover:text-foreground transition-colors cursor-help">
                <kbd className="px-1 py-0.5 rounded bg-muted border text-[8px]">
                  ?
                </kbd>
                <span>Help</span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-64 p-4 text-[11px] normal-case tracking-normal"
              side="top"
              align="end"
            >
              <div className="space-y-2">
                <h4 className="font-bold border-b pb-1 mb-2">
                  Keyboard Shortcuts
                </h4>
                <div className="grid grid-cols-[1fr,2fr] gap-y-1.5 items-center">
                  <kbd className="justify-self-start border px-1 rounded bg-muted/50">
                    /
                  </kbd>{" "}
                  <span>Focus search</span>
                  <kbd className="justify-self-start border px-1 rounded bg-muted/50">
                    ↑↓
                  </kbd>{" "}
                  <span>Navigate cards</span>
                  <kbd className="justify-self-start border px-1 rounded bg-muted/50">
                    ←→
                  </kbd>{" "}
                  <span>Collapse/Expand</span>
                  <kbd className="justify-self-start border px-1 rounded bg-muted/50">
                    E
                  </kbd>{" "}
                  <span>Edit card</span>
                  <kbd className="justify-self-start border px-1 rounded bg-muted/50">
                    S
                  </kbd>{" "}
                  <span>Suspend/Unsuspend</span>
                  <kbd className="justify-self-start border px-1 rounded bg-muted/50">
                    Del
                  </kbd>{" "}
                  <span>Delete card</span>
                  <kbd className="justify-self-start border px-1 rounded bg-muted/50">
                    1
                  </kbd>{" "}
                  <span>Due tab</span>
                  <kbd className="justify-self-start border px-1 rounded bg-muted/50">
                    2
                  </kbd>{" "}
                  <span>Leeches tab</span>
                  <kbd className="justify-self-start border px-1 rounded bg-muted/50">
                    3
                  </kbd>{" "}
                  <span>All tab</span>
                  <kbd className="justify-self-start border px-1 rounded bg-muted/50">
                    L
                  </kbd>{" "}
                  <span>Jump to Leeches</span>
                  <kbd className="justify-self-start border px-1 rounded bg-muted/50">
                    N/P
                  </kbd>{" "}
                  <span>Next/Prev leech</span>
                  <kbd className="justify-self-start border px-1 rounded bg-muted/50">
                    Ctrl+A
                  </kbd>{" "}
                  <span>Select all</span>
                  <kbd className="justify-self-start border px-1 rounded bg-muted/50">
                    Shift+↑↓
                  </kbd>{" "}
                  <span>Extend selection</span>
                  <kbd className="justify-self-start border px-1 rounded bg-muted/50">
                    Esc
                  </kbd>{" "}
                  <span>Clear selection</span>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {activeTab === "due" && (
          <span className="flex items-center gap-1 text-primary font-bold">
            <Zap className="w-3 h-3" />
            Priority Focus
          </span>
        )}
      </div>

      {/* Edit Modal */}
      {editingCard && (
        <CardEditModal
          open={!!editingCard}
          onOpenChange={(open) => !open && setEditingCard(null)}
          cardId={editingCard.id}
          initialFront={editingCard.front}
          initialBack={editingCard.back}
          initialTags={editingCard.tags || []}
          initialReps={editingCard.reps}
          onSave={fetchCards}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingCard}
        onOpenChange={(open) => !open && setDeletingCard(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this card?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The card will be permanently removed
              from your collection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deletingCard && (
            <div className="my-2 p-3 rounded bg-muted/50 border text-sm">
              <span className="text-muted-foreground text-[10px] uppercase tracking-wider block mb-1">
                Front
              </span>
              <p className="line-clamp-2">{deletingCard.front}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Connections Drawer - shows source block and related cards */}
      <Sheet open={sourceDrawerOpen} onOpenChange={setSourceDrawerOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-[600px] overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              {sourceBlockData?.cards.length 
                ? `${sourceBlockData.cards.length} Connected Cards`
                : "Connections"}
            </SheetTitle>
          </SheetHeader>

          {sourceDrawerLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium animate-pulse">
                Loading source context...
              </p>
            </div>
          ) : (
            sourceBlockData && (
              <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Block Content */}
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Original Content
                  </Label>
                  <div className="p-4 rounded-lg bg-muted/30 border text-sm leading-relaxed whitespace-pre-wrap selection:bg-primary/20">
                    {sourceBlockData.block?.content ||
                      "Block content not available"}
                  </div>
                </div>

                {/* Cards from this block */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Cards Generated ({sourceBlockData.cards.length})
                    </Label>
                  </div>

                  <div className="space-y-2">
                    {sourceBlockData.cards.length === 0 ? (
                      <div className="p-8 text-center border rounded-lg border-dashed">
                        <p className="text-sm text-muted-foreground">
                          No sibling cards found.
                        </p>
                      </div>
                    ) : (
                      sourceBlockData.cards.map((card) => (
                        <div
                          key={card.id}
                          className="group p-3 rounded-lg border bg-background hover:bg-muted/50 hover:border-primary/20 transition-all cursor-pointer"
                          onClick={() => {
                            // Try to find the card in the currently filtered list
                            let cardIndex = filteredCards.findIndex(
                              (c) => c.id === card.id,
                            );

                            // If not found in current tab, switch to "All Cards"
                            if (cardIndex === -1 && activeTab !== "all") {
                              setActiveTab("all");
                              // We need to wait for the next render for filteredCards to update
                              // OR we can find it in the 'cards' array which represents the 'all' tab
                              cardIndex = cards.findIndex(
                                (c) => c.id === card.id,
                              );
                            }

                            if (cardIndex !== -1) {
                              setFocusedCardIndex(cardIndex);
                              setExpandedCardId(card.id);
                              listRef.current?.scrollToRow({
                                index: cardIndex,
                                align: "center",
                              });
                              setSourceDrawerOpen(false);
                            } else {
                              toast({
                                title: "Card not found",
                                description:
                                  "This card could not be located in the current view.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <div className="flex justify-between items-start gap-4">
                            <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                              {card.front}
                            </p>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-0.5" />
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              variant="outline"
                              className="text-[9px] h-4 py-0 uppercase tracking-tighter"
                            >
                              {card.state === 0
                                ? "New"
                                : card.state === 4
                                  ? "Suspended"
                                  : "Studied"}
                            </Badge>
                            {card.isLeech && (
                              <Badge
                                variant="outline"
                                className="text-[9px] h-4 py-0 border-amber-500 text-amber-500 bg-amber-500/5"
                              >
                                Leech
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
