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
import { X, FileText, ExternalLink, Sparkles, Brain } from "lucide-react";
import { FlashcardAnalysisDashboard } from "@/components/flashcards/FlashcardAnalysisDashboard";
import { ArchetypeExtractionDialog } from "./ArchetypeExtractionDialog";
import { type KnowledgeEntityType } from "@/types/knowledge-entities";

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
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [extractType, setExtractType] =
    React.useState<KnowledgeEntityType>("generic_concept");
  const [extractTitle, setExtractTitle] = React.useState("");

  // Reset analysis state when dialog opens/closes or item changes
  React.useEffect(() => {
    setIsAnalyzing(false);
    setIsExtracting(false);
  }, [open, item]);

  // For qbank items: use AI summary as title if available
  const displayTitle = React.useMemo(() => {
    if (!item) return "";
    return item.sourceType === "qbank" && item.metadata?.summary
      ? item.metadata.summary
      : item.title;
  }, [item]);

  // Parse content for QBank items
  const qbankContent = React.useMemo(() => {
    if (!item || item.sourceType !== "qbank" || !item.rawContent) return null;
    try {
      const content = JSON.parse(item.rawContent) as BoardQuestionContent;
      if (
        content &&
        typeof content === "object" &&
        content.source &&
        Array.isArray(content.answers)
      ) {
        return content;
      }
    } catch (e) {
      console.warn(
        "SourceItemViewerDialog: Failed to parse qbank content, falling back to raw view.",
        e,
      );
    }
    return null;
  }, [item]);

  // Early return after hooks (React rules satisfied)
  if (!item) return null;

  const handleDraftAccept = async (front: string, back: string) => {
    try {
      // Validate card quality before creation
      // In a real flow, the dashboard/AI sends the type too. Defaulting to 'qa' for now.
      await window.api.ai.validateCard(front, back, "qa");

      const cardId = crypto.randomUUID();
      const noteId = crypto.randomUUID();

      // Create a Note wrapper first (1:N relationship) or just a card if architecture allows
      // Assuming we need a Note for the card
      await window.api.notes.create({
        id: noteId,
        title: displayTitle,
        content: `Generated from ${item.title || "QBank Question"}`,
        cardIds: [],
        tags: item.tags || [],
        createdAt: new Date().toISOString(),
      });

      // Create the card
      await window.api.cards.create({
        front,
        back,
        cardType: "qa",
        tags: item.tags || [],
        sourceBlockId: item.id, // Link to source for tracebility

        // Default FSRS Data
        stability: 0,
        difficulty: 0,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: 0,
        lapses: 0,
        state: 0,
        lastReview: null,

        activationStatus: "active",
        createdAt: new Date().toISOString(),
        dueDate: new Date().toISOString(),
        id: cardId,
        noteId: noteId,
        notebookTopicPageId: null,
        aiTitle: displayTitle,
        parentListId: null,
        listPosition: null,
      });

      setIsAnalyzing(false);
      onClose();
    } catch (e) {
      console.error("Failed to create card", e);
      // Ideally show a toast here
    }
  };

  const handleSaveReference = async () => {
    if (!qbankContent) return;

    try {
      const noteId = crypto.randomUUID();
      const content = `
# Question
${qbankContent.questionStemHtml || ""}

# Answer
${qbankContent.answers.find((a) => a.isCorrect)?.html || "Unknown"}

# Explanation
${qbankContent.explanationHtml || ""}
`.trim();

      await window.api.notes.create({
        id: noteId,
        title: displayTitle || "Reference Note",
        content: content,
        tags: ["reference", "qbank"],
        createdAt: new Date().toISOString(),
        cardIds: [],
      });

      setIsAnalyzing(false);
      onClose();
    } catch (e) {
      console.error("Failed to create reference note", e);
    }
  };

  const renderContent = () => {
    // Analysis Dashboard Mode
    if (isAnalyzing && qbankContent) {
      const latestAttempt =
        qbankContent.attempts?.[qbankContent.attempts.length - 1];
      const correctAnswer = qbankContent.answers.find((a) => a.isCorrect);

      return (
        <FlashcardAnalysisDashboard
          stem={qbankContent.questionStemHtml || "No stem available"}
          userAnswer={latestAttempt?.chosenAnswer || "Unknown"}
          correctAnswer={correctAnswer?.html || "Unknown"}
          explanation={
            qbankContent.explanationHtml || "No explanation available"
          }
          sourceItemTitle={displayTitle}
          onDraftAccept={handleDraftAccept}
          onSaveReference={handleSaveReference}
          onCancel={() => setIsAnalyzing(false)}
        />
      );
    }

    // Specialized viewer for structured QBank questions
    if (qbankContent) {
      return <BoardQuestionView content={qbankContent} />;
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
        ) : item.sourceType === "pdf" && item.mediaPath ? (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-muted/20">
            <FileText className="h-24 w-24 text-orange-500 mb-6" />
            <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
            <p className="text-sm text-muted-foreground mb-8 text-center max-w-md">
              This is a PDF document. Click below to open it in your system's
              default viewer.
            </p>
            <Button
              size="lg"
              className="gap-2"
              onClick={async () => {
                if (item.mediaPath) {
                  await window.api.files.openFile(item.mediaPath);
                }
              }}
            >
              <ExternalLink className="h-5 w-5" />
              Open PDF Document
            </Button>
          </div>
        ) : (
          <div className="bg-muted p-4 rounded-md">
            <pre className="whitespace-pre-wrap font-mono text-xs overflow-auto max-h-[600px]">
              {item.rawContent || "No content available."}
            </pre>
          </div>
        )}

        {(item.sourceUrl || (item.sourceType === "pdf" && item.mediaPath)) && (
          <div className="flex flex-col gap-2">
            {item.sourceUrl && (
              <a
                href={item.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline text-sm inline-flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Open Original URL
              </a>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
        <DialogContent
          className={`max-w-4xl h-[90vh] flex flex-col p-0 gap-0 ${isAnalyzing ? "max-w-6xl" : ""}`}
        >
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

          {/* Action Footer - Hide during analysis */}
          {!isAnalyzing && (
            <TooltipProvider delayDuration={300}>
              <div className="p-4 border-t bg-background flex items-center justify-between flex-none">
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
                  <TooltipContent side="top">
                    <p>Close without taking action</p>
                  </TooltipContent>
                </Tooltip>

                <div className="flex items-center gap-3">
                  {qbankContent && (
                    <Button
                      onClick={() => setIsAnalyzing(true)}
                      className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Analyze Gap
                    </Button>
                  )}

                  {/* Extract Knowledge - Primary Action */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => {
                          setExtractType("generic_concept");
                          setExtractTitle(displayTitle || "");
                          setIsExtracting(true);
                        }}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Brain className="h-4 w-4 mr-2" />
                        Extract Knowledge
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>
                        Create a structured Knowledge Entity and save to Library
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </TooltipProvider>
          )}
        </DialogContent>
      </Dialog>

      {/* Archetype Extraction Dialog */}
      <ArchetypeExtractionDialog
        open={isExtracting}
        onClose={() => setIsExtracting(false)}
        suggestedType={extractType}
        suggestedTitle={extractTitle}
        sourceItemId={item.id}
        onSave={async (entity) => {
          try {
            await window.api.knowledgeEntities.insert({
              id: crypto.randomUUID(),
              entityType: entity.entityType,
              title: entity.title,
              goldenTicketField:
                entity.entityType === "illness_script"
                  ? "keyDiscriminator"
                  : entity.entityType === "drug"
                    ? "mechanismOfAction"
                    : entity.entityType === "pathogen"
                      ? "transmissionRoute"
                      : entity.entityType === "presentation"
                        ? "immediateLifeThreats"
                        : entity.entityType === "diagnostic"
                          ? "whatItMeasures"
                          : entity.entityType === "imaging_finding"
                            ? "clinicalSignificance"
                            : entity.entityType === "procedure"
                              ? "indications"
                              : entity.entityType === "anatomy"
                                ? "clinicalRelevance"
                                : entity.entityType === "algorithm"
                                  ? "scoringInterpretation"
                                  : "oneSentenceSummary",
              goldenTicketValue: entity.goldenTicketValue,
              structuredData: entity.structuredData,
              sourceItemId: entity.sourceItemId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            console.log(
              "[SourceItemViewer] Knowledge entity created:",
              entity.title,
            );
          } catch (e) {
            console.error("Failed to create knowledge entity", e);
          }
        }}
        onSaveAsDraft={async (entity) => {
          try {
            await window.api.knowledgeEntities.insert({
              id: crypto.randomUUID(),
              entityType: entity.entityType,
              title: entity.title,
              structuredData: entity.structuredData,
              sourceItemId: entity.sourceItemId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            console.log(
              "[SourceItemViewer] Draft entity created:",
              entity.title,
            );
          } catch (e) {
            console.error("Failed to create draft entity", e);
          }
        }}
      />
    </>
  );
};
