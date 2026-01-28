import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Moon, Sparkles, Zap, Pause, GraduationCap } from "lucide-react";
import { ActivationStatus } from "@/types";

interface CardStatusBadgeProps {
  activationStatus: ActivationStatus;
  activationReasons?: string[];
  cardCount: number;
  activatedAt?: string;
  suspendReason?: "user" | "leech" | "rotation_end" | null;
  className?: string;
  onClick?: () => void;
}

const STATUS_CONFIG: Record<
  ActivationStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    bgClass: string;
    textClass: string;
  }
> = {
  dormant: {
    label: "Dormant",
    icon: Moon,
    bgClass: "bg-muted/50",
    textClass: "text-muted-foreground",
  },
  suggested: {
    label: "Suggested",
    icon: Sparkles,
    bgClass: "bg-info/10",
    textClass: "text-info",
  },
  active: {
    label: "Active",
    icon: Zap,
    bgClass: "bg-success/10",
    textClass: "text-success",
  },
  suspended: {
    label: "Suspended",
    icon: Pause,
    bgClass: "bg-destructive/10",
    textClass: "text-destructive",
  },
  graduated: {
    label: "Graduated",
    icon: GraduationCap,
    bgClass: "bg-primary/10",
    textClass: "text-primary",
  },
};

/**
 * CardStatusBadge
 *
 * Shows activation status for cards from this block:
 * - Dormant: Gray, moon icon - user knows this
 * - Suggested: Blue, sparkles - AI suggests activating
 * - Active: Green, zap - in review rotation
 * - Suspended: Red, pause - removed from reviews
 * - Graduated: Primary, graduation cap - fully learned
 */
export function CardStatusBadge({
  activationStatus,
  activationReasons = [],
  cardCount,
  activatedAt,
  suspendReason,
  className,
  onClick,
}: CardStatusBadgeProps) {
  if (cardCount === 0) return null;

  const config = STATUS_CONFIG[activationStatus];
  const Icon = config.icon;

  const getSuspendReasonText = () => {
    switch (suspendReason) {
      case "leech":
        return "Auto-suspended (6+ lapses)";
      case "user":
        return "Suspended by you";
      case "rotation_end":
        return "Rotation ended";
      default:
        return null;
    }
  };

  const tooltipContent = (
    <div className="space-y-1.5 max-w-xs">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" />
        <span className="font-semibold text-xs">{config.label}</span>
        <span className="text-xs text-muted-foreground">
          ({cardCount} card{cardCount !== 1 ? "s" : ""})
        </span>
      </div>

      {activationStatus === "suspended" && getSuspendReasonText() && (
        <div className="text-xs text-destructive">{getSuspendReasonText()}</div>
      )}

      {activationReasons.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <div className="font-medium mb-0.5">Why:</div>
          <ul className="list-disc list-inside">
            {activationReasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {activatedAt && (
        <div className="text-[10px] text-muted-foreground/70">
          Activated: {new Date(activatedAt).toLocaleDateString()}
        </div>
      )}

      {onClick && (
        <div className="text-[10px] text-primary pt-1 border-t border-border/50">
          Click for details
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "h-5 px-1.5 text-[10px] font-medium cursor-pointer transition-all",
              "hover:scale-105 hover:shadow-sm",
              config.bgClass,
              config.textClass,
              "border-current/20",
              className
            )}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
          >
            <Icon className="h-3 w-3 mr-1" />
            {cardCount}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" align="center">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
