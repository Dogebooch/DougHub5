import React from "react";
import { NotebookLink } from "@/types";
import { ArrowLeft } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface IncomingLinkRowProps {
  link: NotebookLink;
  sourceTopicName: string;
  onNavigate: (blockId: string) => void;
}

export function IncomingLinkRow({
  link,
  sourceTopicName,
  onNavigate,
}: IncomingLinkRowProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex items-center gap-2 p-2 rounded hover:bg-muted/30 cursor-pointer opacity-80 transition-opacity hover:opacity-100"
            onClick={() => onNavigate(link.sourceBlockId)}
          >
            <ArrowLeft className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="text-sm truncate font-normal">
              {sourceTopicName}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Navigate to source block</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
