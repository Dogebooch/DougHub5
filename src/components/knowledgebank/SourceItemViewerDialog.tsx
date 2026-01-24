import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SourceItem, BoardQuestionContent } from "@/types";
import { BoardQuestionView } from "./BoardQuestionView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BookPlus, Archive, X } from "lucide-react";

interface SourceItemViewerDialogProps {
  open: boolean;
  onClose: () => void;
  item: SourceItem | null;
  onAddToNotebook?: (item: SourceItem) => void;
  onArchiveToKB?: (item: SourceItem) => void;
}

export const SourceItemViewerDialog: React.FC<SourceItemViewerDialogProps> = ({
  open,
  onClose,
  item,
  onAddToNotebook,
  onArchiveToKB,
}) => {
  if (!item) return null;

  // For qbank items: use AI summary as title if available
  const displayTitle =
    item.sourceType === "qbank" && item.metadata?.summary
      ? item.metadata.summary
      : item.title;

  const renderContent = () => {
    // Specialized viewer for structured QBank questions
    if (item.sourceType === "qbank" && item.rawContent) {
      try {
        const content = JSON.parse(item.rawContent) as BoardQuestionContent;
        // Validate that this is actually structured QBank content
        if (
          content &&
          typeof content === "object" &&
          content.source &&
          Array.isArray(content.answers)
        ) {
          return <BoardQuestionView content={content} />;
        }
      } catch (e) {
        console.warn(
          "SourceItemViewerDialog: Failed to parse qbank content, falling back to raw view.",
          e,
        );
      }
    }

    // Default viewer for all other types or fallback
    return (
      <div className="p-4 space-y-4">
        {item.sourceType === "image" && item.mediaPath ? (
          <div className="rounded-lg overflow-hidden border bg-muted/30 flex items-center justify-center">
            <img
              src={`app-media://${item.mediaPath.replace(/\\/g, "/")}`}
              alt={item.title || "Captured image"}
              className="max-w-full max-h-[60vh] rounded-lg border object-contain"
            />
          </div>
        ) : (
          <div className="bg-muted p-4 rounded-md">
            <pre className="whitespace-pre-wrap font-mono text-xs overflow-auto max-h-[600px]">
              {item.rawContent || "No content available."}
            </pre>
          </div>
        )}

        {item.sourceUrl && (
          <div>
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              Open Original URL
            </a>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 border-b flex-none">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="capitalize">
              {item.sourceType}
            </Badge>
            {item.sourceName && (
              <span className="text-xs text-muted-foreground">
                {item.sourceName}
              </span>
            )}
          </div>
          <DialogTitle className="line-clamp-1">{displayTitle}</DialogTitle>
          <DialogDescription className="hidden">
            Content viewer
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">{renderContent()}</ScrollArea>

        {/* Action Footer */}
        <TooltipProvider delayDuration={300}>
          <div className="p-4 border-t bg-background flex items-center justify-end gap-3 flex-none">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="text-muted-foreground"
                >
                  <X className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Close without taking action</p>
              </TooltipContent>
            </Tooltip>
            {onArchiveToKB && item.status !== "curated" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => onArchiveToKB(item)}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Keep in Knowledge Bank
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Mark as reviewed and keep in your Knowledge Bank without adding to Notebook</p>
                </TooltipContent>
              </Tooltip>
            )}
            {onAddToNotebook && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => onAddToNotebook(item)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <BookPlus className="h-4 w-4 mr-2" />
                    Add to Notebook
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add to your Notebook with your insight for card creation</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
};
