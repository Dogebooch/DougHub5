import { useEffect } from "react";
import { useClaudeDevStore } from "@/stores/useClaudeDevStore";
import { Coins } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SessionStats() {
  const { sessionStats, fetchSessionStats, messages } = useClaudeDevStore();

  // Refresh stats when messages change
  useEffect(() => {
    fetchSessionStats();
  }, [fetchSessionStats, messages.length]);

  if (!sessionStats || sessionStats.messageCount === 0) {
    return null;
  }

  const totalTokens =
    sessionStats.totalInputTokens + sessionStats.totalOutputTokens;

  return (
    <div className="px-3 py-1.5 border-t bg-muted/20 flex items-center justify-between text-[10px] text-muted-foreground">
      <div className="flex items-center gap-3">
        <span>{sessionStats.messageCount} messages</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help">
              {totalTokens.toLocaleString()} tokens
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <div className="space-y-0.5">
              <div>
                Input: {sessionStats.totalInputTokens.toLocaleString()} tokens
              </div>
              <div>
                Output: {sessionStats.totalOutputTokens.toLocaleString()} tokens
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 cursor-help">
            <Coins className="w-3 h-3" />
            <span className="font-mono">
              ${sessionStats.estimatedCost.toFixed(4)}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Estimated API cost this session
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
