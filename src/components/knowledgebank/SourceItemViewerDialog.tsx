import React, { useState, useEffect, useRef, useCallback } from "react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StickyNote, ChevronDown, Loader2 } from "lucide-react";

interface SourceItemViewerDialogProps {
  open: boolean;
  onClose: () => void;
  item: SourceItem | null;
}

export const SourceItemViewerDialog: React.FC<SourceItemViewerDialogProps> = ({
  open,
  onClose,
  item,
}) => {
  const [notes, setNotes] = useState(item?.notes || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const notesTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (item) setNotes(item.notes || "");
  }, [item]);

  const saveNotes = useCallback(
    async (value: string) => {
      if (!item) return;
      setIsSavingNotes(true);
      try {
        await window.api.sourceItems.update(item.id, { notes: value || null });
      } catch (err) {
        console.error("Failed to save notes:", err);
      } finally {
        setIsSavingNotes(false);
      }
    },
    [item],
  );

  const handleNotesChange = (value: string) => {
    setNotes(value);
    if (notesTimeout.current) clearTimeout(notesTimeout.current);
    notesTimeout.current = setTimeout(() => saveNotes(value), 400);
  };

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

        {/* Personal Notes (v18) */}
        <div className="p-4 border-t bg-muted/10">
          <Collapsible defaultOpen={!!notes}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-2 h-auto hover:bg-muted/20"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <StickyNote className="h-4 w-4" />
                  Personal Notes
                  {isSavingNotes && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="animate-in fade-in slide-in-from-top-1 duration-200">
              <Textarea
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Add informal annotations (e.g., 'I thought X because Y')"
                className="min-h-[80px] mt-2 bg-background border-muted resize-none focus-visible:ring-1"
              />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </DialogContent>
    </Dialog>
  );
};
