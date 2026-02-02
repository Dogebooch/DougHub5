import React from "react";
import {
  X,
  ExternalLink,
  Link as LinkIcon,
  AlertTriangle,
  Lightbulb,
  Image,
  Loader2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useConnectedContent } from "@/hooks/useConnectedContent";
import { cn } from "@/lib/utils";

interface ConnectedContentPanelProps {
  activeNodeId: string | null;
  onClose: () => void;
  className?: string;
  onAddFlashcard?: (blockId: string) => void;
  onViewSource?: (sourceId: string) => void;
}

export const ConnectedContentPanel: React.FC<ConnectedContentPanelProps> = ({
  activeNodeId,
  onClose,
  className,
  onAddFlashcard,
  onViewSource,
}) => {
  const { block, flashcards, sourceItem, confusionPatterns, isLoading } =
    useConnectedContent(activeNodeId);

  if (!activeNodeId) {
    return (
      <div
        className={cn(
          "flex h-full flex-col bg-muted/30 p-6 text-center",
          className,
        )}
      >
        <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
          <LinkIcon className="mb-4 h-12 w-12 opacity-20" />
          <h3 className="text-lg font-medium">Select a Node</h3>
          <p className="text-sm">
            Click any block in the editor to see connected flashcards, sources,
            and mnemonics.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex h-full flex-col items-center justify-center border-l bg-background",
          className,
        )}
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full flex-col border-l border-border bg-background",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="font-semibold truncate pr-2">
          {block?.isHighYield && <span className="mr-2 text-amber-500">★</span>}
          Connected Content
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-6 p-4">
          {/* Flashcards Section */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-sm font-medium">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Flashcards ({flashcards.length})
              </h4>
              <Button
                variant="outline"
                size="xs"
                className="h-6 text-xs gap-1"
                onClick={() => activeNodeId && onAddFlashcard?.(activeNodeId)}
              >
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>

            {flashcards.length === 0 ? (
              <div className="text-xs text-muted-foreground italic pl-6">
                No flashcards yet.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {flashcards.map((card) => (
                  <div
                    key={card.id}
                    className="rounded-md border bg-card p-3 shadow-sm text-sm group"
                  >
                    <div
                      className="font-medium line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: card.front }}
                    />
                    <Separator className="my-2" />
                    <div
                      className="text-muted-foreground line-clamp-2 text-xs"
                      dangerouslySetInnerHTML={{ __html: card.back }}
                    />

                    {/* Status Badge */}
                    <div className="mt-2 flex gap-2">
                      {card.isLeech && (
                        <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                          Leech
                        </span>
                      )}
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                          card.state === 0
                            ? "bg-blue-500/10 text-blue-500"
                            : card.state === 1
                              ? "bg-amber-500/10 text-amber-500"
                              : "bg-green-500/10 text-green-500",
                        )}
                      >
                        {card.state === 0
                          ? "New"
                          : card.state === 1
                            ? "Learning"
                            : "Review"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* Source Section */}
          <section className="flex flex-col gap-3">
            <h4 className="flex items-center gap-2 text-sm font-medium">
              <ExternalLink className="h-4 w-4 text-blue-500" />
              Source Trace
            </h4>
            {sourceItem ? (
              <div className="rounded-md border border-dashed bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  Extracted from {sourceItem.sourceType}:
                </p>
                <div
                  className="flex items-center gap-2 font-medium hover:underline cursor-pointer text-sm text-primary"
                  onClick={() => onViewSource?.(sourceItem.id)}
                >
                  📄{" "}
                  {sourceItem.title ||
                    sourceItem.sourceName ||
                    "Untitled Source"}
                </div>
                {sourceItem.metadata?.summary && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-3">
                    "{sourceItem.metadata.summary}"
                  </p>
                )}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground italic pl-6">
                No linked source.
              </div>
            )}
          </section>

          <Separator />

          {/* Mnemonics Section */}
          <section className="flex flex-col gap-3">
            <h4 className="flex items-center gap-2 text-sm font-medium">
              <Image className="h-4 w-4 text-purple-500" />
              Picture Mnemonic
            </h4>
            {block?.mediaPath ? (
              <div className="aspect-video w-full rounded-md overflow-hidden bg-black/5 border relative group cursor-pointer">
                <img
                  src={`file://${block.mediaPath}`}
                  alt="Mnemonic"
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                  Edit in NeuroCanvas
                </div>
              </div>
            ) : (
              <div className="aspect-video w-full rounded-md bg-muted flex flex-col items-center justify-center text-xs text-muted-foreground gap-2 p-4">
                <span>No Mnemonic Linked</span>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full h-7 text-xs"
                >
                  Create NeuroCanvas
                </Button>
              </div>
            )}
          </section>

          <Separator />

          {/* Distractors/Backlinks */}
          {confusionPatterns.length > 0 && (
            <section className="flex flex-col gap-3">
              <h4 className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Confusion Patterns
              </h4>
              {confusionPatterns.map((pattern, idx) => (
                <div
                  key={idx}
                  className="rounded-md bg-destructive/10 p-3 text-sm text-destructive-foreground"
                >
                  ⚠️ {pattern}
                </div>
              ))}
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
