import React from 'react';
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
  if (!item) return null;

  const renderContent = () => {
    if (item.sourceType === "qbank" && item.rawContent) {
      try {
        const content = JSON.parse(item.rawContent) as BoardQuestionContent;
        return <BoardQuestionView content={content} />;
      } catch (e) {
        return (
          <div className="p-4 text-destructive">
            Failed to parse question content: {(e as Error).message}
          </div>
        );
      }
    }

    // Fallback for other types
    return (
      <div className="p-4 space-y-4">
        <div className="bg-muted p-4 rounded-md">
           <pre className="whitespace-pre-wrap font-mono text-xs overflow-auto max-h-[400px]">
             {item.rawContent || "No content available."}
           </pre>
        </div>
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
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-2 border-b flex-none">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="capitalize">
              {item.sourceType}
            </Badge>
            {item.sourceName && (
               <span className="text-xs text-muted-foreground">{item.sourceName}</span>
            )}
          </div>
          <DialogTitle className="line-clamp-1">{item.title}</DialogTitle>
          <DialogDescription className="hidden">
            Content viewer
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-6">
          {renderContent()}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
