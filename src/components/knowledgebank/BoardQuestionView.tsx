import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  Clock,
  ExternalLink,
  ZoomIn,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { BoardQuestionContent } from "@/types";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface BoardQuestionViewProps {
  content: BoardQuestionContent;
  className?: string;
}

export const BoardQuestionView: React.FC<BoardQuestionViewProps> = ({
  content,
  className,
}) => {
  const [isAttemptsOpen, setIsAttemptsOpen] = useState(false);
  const [isExplanationOpen, setIsExplanationOpen] = useState(true);
  const [isKeyPointsOpen, setIsKeyPointsOpen] = useState(true);
  const [isPeerPearlsOpen, setIsPeerPearlsOpen] = useState(true);
  const [isReferencesOpen, setIsReferencesOpen] = useState(false);
  const [isVignetteExpanded, setIsVignetteExpanded] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<{
    url: string;
    caption?: string;
  } | null>(null);
  const userDataPath = useAppStore((state) => state.userDataPath);

  // Deduplicate: If vignetteHtml ends with questionStemHtml, we should
  // probably not render the question part inside the vignette block
  // because it's rendered below in its own highlighted section.
  const displayVignetteHtml = React.useMemo(() => {
    const vRaw = content.vignetteHtml || "";
    const qRaw = content.questionStemHtml || "";

    let finalHtml = vRaw.trim();

    if (vRaw && qRaw) {
      const v = vRaw.trim();
      const q = qRaw.trim();

      // Try basic string deduplication
      if (v.endsWith(q)) {
        const stripped = v.slice(0, v.lastIndexOf(q)).trim();
        finalHtml = stripped.length > 5 ? stripped : v;
      } else {
        // Try text-only comparison for more robustness against minor HTML/spacing differences
        const vText = v.replace(/<[^>]*>/g, "").trim();
        const qText = q.replace(/<[^>]*>/g, "").trim();

        if (vText.endsWith(qText) && qText.length > 0) {
          const qStart = qText.slice(0, 20);
          const lastIndex = v.lastIndexOf(qStart);
          if (lastIndex !== -1) {
            const stripped = v.slice(0, lastIndex).trim();
            finalHtml = stripped.length > 5 ? stripped : v;
          }
        }
      }
    }

    return processHtml(finalHtml);
  }, [content.vignetteHtml, content.questionStemHtml, processHtml]);

  const processedQuestionStem = React.useMemo(
    () => processHtml(content.questionStemHtml),
    [content.questionStemHtml, processHtml]
  );
  const processedExplanation = React.useMemo(
    () => processHtml(content.explanationHtml),
    [content.explanationHtml, processHtml]
  );
  const processedKeyPoints = React.useMemo(
    () => processHtml(content.keyPointsHtml),
    [content.keyPointsHtml, processHtml]
  );
  const processedPeerPearls = React.useMemo(
    () => processHtml(content.peerPearlsHtml),
    [content.peerPearlsHtml, processHtml]
  );
  const processedReferences = React.useMemo(
    () => processHtml(content.referencesHtml),
    [content.referencesHtml, processHtml]
  );

  const isLongVignette = (content.vignetteHtml?.length || 0) > 600;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getImagePath = (localPath: string) => {
    if (!localPath) return "";
    // app-media:// protocol maps to userData folder
    const normalizedPath = localPath.replace(/\\/g, "/");
    return `app-media://${normalizedPath}`;
  };

  /**
   * Replaces remote image URLs in HTML string with local app-media hits
   */
  const processHtml = React.useCallback(
    (html: string | undefined): string => {
      if (!html) return "";
      let processed = html;
      content.images.forEach((img) => {
        if (img.originalUrl && img.localPath) {
          const localUrl = getImagePath(img.localPath);
          // Simple string replace or regex is fine for these static URLs
          const escapedUrl = img.originalUrl.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );
          const regex = new RegExp(escapedUrl, "g");
          processed = processed.replace(regex, localUrl);
        }
      });
      return processed;
    },
    [content.images]
  );

  const renderImages = (
    location:
      | "vignette"
      | "explanation"
      | "keypoint"
      | "references"
      | "peerpearls"
  ) => {
    const sectionImages = content.images.filter(
      (img) => img.location === location
    );
    if (sectionImages.length === 0) return null;

    return (
      <div className="mt-4 flex flex-wrap gap-4 items-start">
        {sectionImages.map((img, idx) => {
          const imagePath = getImagePath(img.localPath);
          return (
            <div key={idx} className="flex flex-col items-center max-w-[30%]">
              <div
                className="relative group cursor-zoom-in"
                onClick={() =>
                  setZoomedImage({ url: imagePath, caption: img.caption })
                }
              >
                <img
                  src={imagePath}
                  alt={img.caption || `Image ${idx + 1}`}
                  className="w-full h-auto rounded-md shadow-sm border border-border transition-transform hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center rounded-md">
                  <ZoomIn className="text-white opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6" />
                </div>
              </div>
              {img.caption && (
                <p className="text-[10px] text-muted-foreground mt-2 italic text-center leading-tight">
                  {img.caption}
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className={cn("w-full shadow-md overflow-hidden", className)}>
      {/* Header Row */}
      <CardHeader className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="secondary"
              className={cn(
                "capitalize",
                content.source === "peerprep"
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              )}
            >
              {content.source === "peerprep" ? "PeerPrep" : "MKSAP"}
            </Badge>

            {content.category && (
              <Badge variant="outline" className="text-xs">
                {content.category}
              </Badge>
            )}

            <span className="text-xs text-muted-foreground ml-1">
              {formatDate(content.capturedAt)}
            </span>

            {content.attempts && content.attempts.length > 0 && (
              <Collapsible
                open={isAttemptsOpen}
                onOpenChange={setIsAttemptsOpen}
              >
                <CollapsibleTrigger asChild>
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-muted ml-2 transition-colors flex items-center gap-1"
                  >
                    <Clock className="w-3 h-3" />
                    Attempts ({content.attempts.length})
                    <ChevronDown
                      className={cn(
                        "w-3 h-3 transition-transform",
                        isAttemptsOpen && "rotate-180"
                      )}
                    />
                  </Badge>
                </CollapsibleTrigger>
              </Collapsible>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={content.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[26rem] truncate">
                {content.sourceUrl}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Attempts History */}
        {content.attempts && content.attempts.length > 0 && isAttemptsOpen && (
          <div className="mt-3 p-3 bg-muted/50 rounded-md border border-border text-xs space-y-2">
            <h4 className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Attempt History
            </h4>
            {[...content.attempts].reverse().map((attempt, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between border-b border-border/50 pb-1 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    Attempt {attempt.attemptNumber}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span>{formatDate(attempt.date)}</span>
                  <span className="text-muted-foreground">•</span>
                  <span>Chose {attempt.chosenAnswer}</span>
                </div>
                {attempt.wasCorrect ? (
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-500" />
                )}
              </div>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {/* Vignette Section */}
          <div className="p-6 relative group/vignette">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
                Patient Scenario
              </span>
              {isLongVignette && (
                <button
                  onClick={() => setIsVignetteExpanded(!isVignetteExpanded)}
                  className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
                >
                  {isVignetteExpanded ? "Collapse" : "Show Full Scenario"}
                </button>
              )}
            </div>

            <div
              className={cn(
                "prose prose-sm max-w-none leading-relaxed transition-all duration-300",
                isLongVignette &&
                  !isVignetteExpanded &&
                  "line-clamp-3 opacity-60"
              )}
              dangerouslySetInnerHTML={{ __html: displayVignetteHtml }}
            />

            {isLongVignette && !isVignetteExpanded && (
              <div
                className="absolute bottom-6 left-6 right-6 h-12 bg-gradient-to-t from-background via-background/80 to-transparent cursor-pointer"
                onClick={() => setIsVignetteExpanded(true)}
              />
            )}

            {(isVignetteExpanded || !isLongVignette) &&
              renderImages("vignette")}
          </div>

          {/* Question Stem Section */}
          <div className="p-6 bg-primary/5 border-y border-primary/10">
            <span className="text-[10px] font-bold text-primary/70 tracking-widest uppercase block mb-3">
              Clinical Question
            </span>
            <div
              className="prose prose-sm max-w-none font-semibold text-lg text-foreground"
              dangerouslySetInnerHTML={{ __html: processedQuestionStem }}
            />
          </div>

          {/* Answers Section */}
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground text-left">
                  <th className="px-4 py-2 font-medium w-12 text-center">
                    Res
                  </th>
                  <th className="px-2 py-2 font-medium w-10">Ltr</th>
                  <th className="px-4 py-2 font-medium">Answer Option</th>
                  <th className="px-4 py-2 font-medium w-32">Peers</th>
                  <th className="px-4 py-2 font-medium w-12 text-center">
                    You
                  </th>
                </tr>
              </thead>
              <tbody>
                {content.answers.map((answer, idx) => {
                  const isWrongUserChoice =
                    answer.isUserChoice && !answer.isCorrect;
                  const isCorrectAnswer = answer.isCorrect;
                  const processedAnswerHtml = processHtml(answer.html);

                  return (
                    <tr
                      key={idx}
                      className={cn(
                        "border-t border-border group transition-colors",
                        isCorrectAnswer &&
                          "bg-green-50/50 dark:bg-green-950/20",
                        isWrongUserChoice && "bg-red-50/50 dark:bg-red-950/20",
                        !isCorrectAnswer &&
                          !isWrongUserChoice &&
                          "hover:bg-muted/30"
                      )}
                    >
                      <td className="px-4 py-3 text-center">
                        {isCorrectAnswer && (
                          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 mx-auto" />
                        )}
                        {isWrongUserChoice && (
                          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 mx-auto" />
                        )}
                      </td>
                      <td className="px-2 py-3 font-bold text-muted-foreground">
                        {answer.letter}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: processedAnswerHtml,
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        {answer.peerPercent !== undefined && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-medium leading-none">
                              {answer.peerPercent}%
                            </span>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary/40 rounded-full"
                                style={{ width: `${answer.peerPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {answer.isUserChoice && (
                          <div className="w-2.5 h-2.5 rounded-full bg-primary mx-auto animate-in fade-in zoom-in" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Explanation Section */}
          <Collapsible
            open={isExplanationOpen}
            onOpenChange={setIsExplanationOpen}
            className="p-0"
          >
            <div className="border-t border-border">
              <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
                  Explanation
                </span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    isExplanationOpen && "rotate-180"
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-6 pb-6 pt-0">
                  <div
                    className="prose prose-sm max-w-none border-l-2 border-primary/20 pl-4 py-1"
                    dangerouslySetInnerHTML={{
                      __html: processedExplanation,
                    }}
                  />
                  {renderImages("explanation")}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Key Points Section */}
          {content.keyPointsHtml && (
            <Collapsible
              open={isKeyPointsOpen}
              onOpenChange={setIsKeyPointsOpen}
              className="p-0"
            >
              <div className="border-t border-border">
                <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left">
                  <span className="text-[10px] font-bold text-warning tracking-widest uppercase">
                    Key Points
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform",
                      isKeyPointsOpen && "rotate-180"
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-6 pb-6 pt-0">
                    <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: processedKeyPoints,
                        }}
                      />
                    </div>
                    {renderImages("keypoint")}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

          {/* Peer Pearls Section */}
          {content.peerPearlsHtml && (
            <Collapsible
              open={isPeerPearlsOpen}
              onOpenChange={setIsPeerPearlsOpen}
              className="p-0"
            >
              <div className="border-t border-border">
                <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left">
                  <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase text-indigo-600 dark:text-indigo-400">
                    Peer Pearls
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform",
                      isPeerPearlsOpen && "rotate-180"
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-6 pb-6 pt-0">
                    <div className="bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-200/50 dark:border-indigo-900/50 rounded-lg p-4">
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: processedPeerPearls,
                        }}
                      />
                    </div>
                    {renderImages("peerpearls")}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

          {/* References Section */}
          {content.referencesHtml && (
            <Collapsible
              open={isReferencesOpen}
              onOpenChange={setIsReferencesOpen}
              className="p-0"
            >
              <div className="border-t border-border">
                <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left">
                  <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
                    References
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform",
                      isReferencesOpen && "rotate-180"
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-6 pb-6 pt-0">
                    <div
                      className="prose prose-xs max-w-none text-muted-foreground opacity-80"
                      dangerouslySetInnerHTML={{
                        __html: processedReferences,
                      }}
                    />
                    {renderImages("references")}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}
        </div>
      </CardContent>

      {/* Image Zoom Modal */}
      <Dialog
        open={!!zoomedImage}
        onOpenChange={(open) => !open && setZoomedImage(null)}
      >
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-1 border-none bg-transparent shadow-none flex flex-col items-center justify-center">
          {zoomedImage && (
            <div className="relative group">
              <img
                src={zoomedImage.url}
                alt={zoomedImage.caption || "Zoomed image"}
                className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl bg-card"
              />
              {zoomedImage.caption && (
                <div className="mt-4 p-3 bg-black/60 backdrop-blur-md rounded-lg text-white text-sm text-center max-w-2xl mx-auto">
                  {zoomedImage.caption}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
