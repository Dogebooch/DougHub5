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
  const [zoomedImage, setZoomedImage] = useState<{
    url: string;
    caption?: string;
  } | null>(null);
  const userDataPath = useAppStore((state) => state.userDataPath);

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
        if (img.url && img.localPath) {
          const localUrl = getImagePath(img.localPath);
          // Simple string replace or regex is fine for these static URLs
          const escapedUrl = img.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const regex = new RegExp(escapedUrl, "g");
          processed = processed.replace(regex, localUrl);
        }
      });
      return processed;
    },
    [content.images]
  );

  /**
   * Ensures content is structured as a bulleted list.
   * If the input is plain text or paragraphs, it wraps them in <ul><li> tags.
   */
  const formatAsBullets = React.useCallback(
    (html: string | undefined): string => {
      if (!html) return "";
      const trimmed = html.trim();
      if (!trimmed) return "";

      // If it already contains list structure, just return it
      if (
        trimmed.includes("<li") ||
        trimmed.includes("<ul") ||
        trimmed.includes("<ol") ||
        trimmed.includes("•") ||
        trimmed.includes("&bull;")
      ) {
        return trimmed;
      }

      // If it contains paragraphs, convert <p> groups to <li> items
      if (trimmed.includes("<p")) {
        const bulleted = trimmed
          .replace(/<p[^>]*?>/gi, "<li>")
          .replace(/<\/p>/gi, "</li>");

        // Cleanup any empty list items that might have been created
        const cleaned = bulleted.replace(/<li>\s*<\/li>/gi, "");
        return `<ul>${cleaned}</ul>`;
      }

      // Split by newlines if they exist, otherwise treat as single item
      if (trimmed.includes("\n")) {
        const items = trimmed
          .split("\n")
          .filter((line) => line.trim().length > 0)
          .map((line) => `<li>${line.trim()}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }

      // Fallback: wrap the entire block in a list
      return `<ul><li>${trimmed}</li></ul>`;
    },
    []
  );

  // Deduplicate: If vignetteHtml ends with questionStemHtml, we should
  // probably not render the question part inside the vignette block
  // because it's rendered below in its own highlighted section.
  const displayVignetteHtml = React.useMemo(() => {
    const vRaw = content.vignetteHtml || "";
    const qRaw = content.questionStemHtml || "";

    if (!vRaw) return "";
    if (!qRaw) return processHtml(vRaw);

    const v = vRaw.trim();
    const q = qRaw.trim();

    // 1. Exact suffix match (fastest and safest)
    if (v.endsWith(q)) {
      const stripped = v.slice(0, v.lastIndexOf(q)).trim();
      return processHtml(stripped);
    }

    // 2. Fuzzy match logic
    try {
      // Normalize both to checking content overlap
      const normalize = (s: string) =>
        s
          .replace(/<[^>]*>/g, " ") // Replace tags with space
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim();

      const vText = normalize(v);
      const qText = normalize(q);

      // Only attempt complex deduplication if we have a content match at the end
      if (qText.length > 15 && vText.endsWith(qText)) {
        // Construct a regex to find the start of the question in the HTML
        // We take the first 40 characters of the question text
        // and create a pattern that allows tags/whitespace between them
        const qStartChars = q
          .replace(/<[^>]*>/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 40)
          .split("");

        const pattern = qStartChars
          .map((char) => {
            const escaped = char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            return `${escaped}(?:<[^>]*>|\\s|&nbsp;)*`;
          })
          .join("");

        const regex = new RegExp(pattern, "gi");
        let lastMatch: RegExpExecArray | null = null;
        let match;

        while ((match = regex.exec(v)) !== null) {
          lastMatch = match;
        }

        if (lastMatch) {
          // Found the question start in the HTML
          // Verify we are indeed near the end (heuristic: remainder length checks)
          // Actually, since vText ends with qText, the last match of qStart *should* be the one.
          const stripped = v.slice(0, lastMatch.index).trim();
          return processHtml(stripped);
        }
      }
    } catch (e) {
      console.warn("Deduplication logic failed", e);
    }

    // Fallback: Use the original if no robust removal was possible
    return processHtml(v);
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
    () => formatAsBullets(processHtml(content.keyPointsHtml)),
    [content.keyPointsHtml, processHtml, formatAsBullets]
  );
  const processedPeerPearls = React.useMemo(
    () => formatAsBullets(processHtml(content.peerPearlsHtml)),
    [content.peerPearlsHtml, processHtml, formatAsBullets]
  );
  const processedReferences = React.useMemo(
    () => processHtml(content.referencesHtml),
    [content.referencesHtml, processHtml]
  );

  // Deduplicate answers by letter, keeping the one with most metadata
  const displayedAnswers = React.useMemo(() => {
    if (!content.answers) return [];

    // Normalize text for comparison: strip HTML, collapse whitespace, lowercase
    const normalizeText = (html: string) =>
      (html || "")
        .replace(/<[^>]*>/g, "") // Remove HTML tags
        .replace(/\s+/g, " ") // Collapse whitespace
        .trim()
        .toLowerCase();

    const getScore = (a: (typeof content.answers)[0]) => {
      let score = 0;
      if (a.isUserChoice) score += 100;
      if (a.isCorrect) score += 50;
      if (a.peerPercent !== undefined) score += 20;
      if (/^[A-F]$/i.test(a.letter)) score += 10;
      return score;
    };

    // Deduplicate by letter first (primary key)
    const uniqueByLetter = new Map<string, (typeof content.answers)[0]>();
    for (const answer of content.answers) {
      const text = normalizeText(answer.html);
      if (!text) continue;

      // Only keep valid answer letters (A-F)
      if (!/^[A-F]$/i.test(answer.letter)) continue;

      const letterKey = answer.letter.toUpperCase();
      const existing = uniqueByLetter.get(letterKey);

      if (!existing || getScore(answer) > getScore(existing)) {
        uniqueByLetter.set(letterKey, answer);
      }
    }

    return Array.from(uniqueByLetter.values()).sort((a, b) =>
      a.letter.localeCompare(b.letter)
    );
  }, [content.answers]);

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

  const renderImages = (
    location:
      | "vignette"
      | "question"
      | "explanation"
      | "keypoint"
      | "references"
      | "peerpearls",
    size: "small" | "large" = "small"
  ) => {
    const sectionImages = content.images.filter(
      (img) => img.location === location
    );
    if (sectionImages.length === 0) return null;

    return (
      <div
        className={cn(
          "mt-4 flex flex-wrap gap-4 items-start",
          size === "large" ? "flex-col" : "flex-row"
        )}
      >
        {sectionImages.map((img, idx) => {
          const imagePath = getImagePath(img.localPath);
          return (
            <div
              key={idx}
              className={cn(
                "flex flex-col items-center",
                size === "large" ? "w-full max-w-2xl" : "max-w-[30%]"
              )}
            >
              <div
                className="relative group cursor-zoom-in w-full"
                onClick={() =>
                  setZoomedImage({ url: imagePath, caption: img.caption })
                }
              >
                <img
                  src={imagePath}
                  alt={img.caption || `Image ${idx + 1}`}
                  className="w-full h-auto rounded-md shadow-sm border border-border transition-transform hover:scale-[1.01]"
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
          {/* Question & Vignette Section */}
          <div className="p-6 bg-primary/5 border-y border-primary/10">
            {displayVignetteHtml && (
              <div
                className="prose prose-sm max-w-none leading-relaxed mb-6 text-foreground/90"
                dangerouslySetInnerHTML={{ __html: displayVignetteHtml }}
              />
            )}

            <div
              className={cn(
                "space-y-3",
                displayVignetteHtml && "pt-6 border-t border-primary/10"
              )}
            >
              <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase block">
                Clinical Question
              </span>
              <div
                className="prose prose-sm max-w-none font-semibold text-lg text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: processedQuestionStem }}
              />
            </div>

            {content.images.some(
              (img) =>
                img.location === "question" || img.location === "vignette"
            ) && (
              <div className="mt-6 pt-4 border-t border-primary/5">
                {renderImages("question")}
                {renderImages("vignette")}
              </div>
            )}
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
                {displayedAnswers.map((answer, idx) => {
                  const isWrongUserChoice =
                    answer.isUserChoice && !answer.isCorrect;
                  const isCorrectAnswer = answer.isCorrect;
                  const processedAnswerHtml = processHtml(answer.html);

                  // Calculate if this is the most picked pear choice
                  const maxPeerPercent = Math.max(
                    ...displayedAnswers
                      .map((a) => a.peerPercent || 0)
                      .filter((p) => p > 0),
                    0
                  );
                  const isMajorityChoice =
                    answer.peerPercent !== undefined &&
                    answer.peerPercent === maxPeerPercent &&
                    maxPeerPercent > 0;

                  return (
                    <tr
                      key={idx}
                      className={cn(
                        "border-t border-border group transition-colors relative",
                        isCorrectAnswer &&
                          "bg-success/5 dark:bg-success/10 border-l-4 border-l-success/70",
                        isWrongUserChoice &&
                          "bg-destructive/5 dark:bg-destructive/10",
                        !isCorrectAnswer &&
                          !isWrongUserChoice &&
                          "hover:bg-muted/30"
                      )}
                    >
                      <td className="px-4 py-3 text-center">
                        {isCorrectAnswer && (
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-success/10 dark:bg-success/20 mx-auto border border-success/30">
                            <CheckCircle2 className="w-5 h-5 text-success" />
                          </div>
                        )}
                        {isWrongUserChoice && (
                          <XCircle className="w-5 h-5 text-destructive mx-auto" />
                        )}
                      </td>
                      <td
                        className={cn(
                          "px-2 py-3 font-bold text-base",
                          isCorrectAnswer
                            ? "text-success"
                            : isWrongUserChoice
                            ? "text-destructive"
                            : "text-muted-foreground"
                        )}
                      >
                        {answer.letter}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className={cn(
                            "prose prose-sm max-w-none",
                            isCorrectAnswer &&
                              "font-semibold text-success-foreground"
                          )}
                          dangerouslySetInnerHTML={{
                            __html: processedAnswerHtml,
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        {answer.peerPercent !== undefined && (
                          <div className="flex flex-col gap-1.5 min-w-[80px]">
                            <div className="flex items-center justify-end">
                              <span
                                className={cn(
                                  "text-xs font-semibold leading-none tabular-nums",
                                  isCorrectAnswer
                                    ? "text-success"
                                    : "text-muted-foreground"
                                )}
                              >
                                {answer.peerPercent}%
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-muted/50 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  isCorrectAnswer
                                    ? "bg-success/70"
                                    : "bg-primary/40"
                                )}
                                style={{ width: `${answer.peerPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {answer.isUserChoice && (
                          <Badge
                            variant="default"
                            className="bg-primary hover:bg-primary text-[9px] font-black px-1.5 py-0 h-4 shadow-sm animate-in fade-in zoom-in slide-in-from-right-1"
                          >
                            YOU
                          </Badge>
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
                    {renderImages("peerpearls", "large")}
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




