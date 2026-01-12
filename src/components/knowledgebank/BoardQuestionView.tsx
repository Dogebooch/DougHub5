import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  Clock,
  ExternalLink,
  ZoomIn,
  FileText,
  Lightbulb,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { BoardQuestionContent } from "@/types";
import { cn } from "@/lib/utils";
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

  const processedQuestionStem = React.useMemo(() => {
    const raw = processHtml(content.questionStemHtml);
    if (!raw) return "";

    // Normalize whitespace to make regex more predictable
    const normalized = raw
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Heuristic: The actual question is usually the last sentence.
    // We look for the last sentence boundary: a punctuation followed by space and capital letter/tag.
    // Pattern: capture everything before the last sentence, then everything after the space.
    const splitRegex = /^(.*[.?!])\s+([A-Z<][^.?!]*[.?!]?)$/s;
    const match = normalized.match(splitRegex);

    if (match) {
      const [_, context, question] = match;
      return `${context} <strong class="font-bold text-card-foreground">${question}</strong>`;
    }

    // Fallback: If no clear split (e.g., single sentence), bold it all as it's the lead-in
    return `<strong class="font-bold text-card-foreground">${normalized}</strong>`;
  }, [content.questionStemHtml, processHtml]);
  const processedExplanation = React.useMemo(() => {
    let html = processHtml(content.explanationHtml);
    if (!html) return "";

    // Identify common headers and wrap them in a cleaner sub-header style (card-aware colors)
    const sectionHeaders = [
      "Critique", // MKSAP-specific
      "Educational Objective",
      "Key Point",
      "Rationale",
      "Clinical Pearl",
      "Incorrect Answer",
      "Incorrect Answers",
      "Distractor Analysis",
      "Discussion",
    ];

    sectionHeaders.forEach((header) => {
      const regex = new RegExp(
        `(<[^>]+>)|(?:\\b|^)(${header})(?::|\\.|\\b)`,
        "gi"
      );
      html = html.replace(regex, (match, tag, h) => {
        if (tag) return tag;
        return `<div class="mt-10 mb-4 first:mt-0 pt-6 first:pt-0 border-t border-card-muted/20 first:border-t-0">
          <div class="flex items-center gap-2 mb-3">
            <div class="h-1 w-1 rounded-full bg-primary/60"></div>
            <span class="text-xs font-extrabold text-primary/80 tracking-[0.15em] uppercase">${h}</span>
          </div>
        </div>`;
      });
    });

    // PeerPrep-specific: Detect answer choice subheadings (short title lines followed by explanation)
    // Pattern: <p> with short text (10-60 chars, no ending punctuation) followed by <p> with longer text
    // Examples: "Heated refrigerator chemicals", "Swimming pool maintenance agents"
    if (content.source === "peerprep") {
      html = html.replace(
        /<p([^>]*)>([^<]{10,60})<\/p>(\s*)<p([^>]*)>([^<]{80,})/gi,
        (match, attrs1, title, whitespace, attrs2, body) => {
          const trimmedTitle = title.trim();
          // Only style as subheading if it looks like a title:
          // - No ending punctuation (., ?, !)
          // - Doesn't start with common sentence starters
          const endsWithPunctuation = /[.?!]$/.test(trimmedTitle);
          const startsLikeSentence =
            /^(The|This|These|A|An|In|It|If|When|Although)\s/i.test(
              trimmedTitle
            );

          if (!endsWithPunctuation && !startsLikeSentence) {
            return `<div class="mt-6 pt-4 border-t border-border/30">
              <p${attrs1} class="!mt-0 !mb-2 font-semibold text-card-foreground">${trimmedTitle}</p>
            </div>${whitespace}<p${attrs2}>${body}`;
          }
          return match;
        }
      );
    }

    // Improve the choiceRegex to catch "(Option B)", "Option B", and "(B)"
    // while ensuring we don't catch random letters at the start of words
    const choiceRegex =
      /(<[^>]+>)|(\b(?:Option|Choice|Answer|Choice Option)\s+([A-F])\b|(?<=\s|^)\(([A-F])\)(?=\s|\.|,|$))/gi;

    html = html.replace(choiceRegex, (match, tag, _full, letter1, letter2) => {
      if (tag) return tag;
      const letter = (letter1 || letter2 || "").toUpperCase();
      // Return clean bolded reference without extra parentheses
      return `<strong class="text-primary font-bold">Option ${letter}</strong>`;
    });

    return html;
  }, [content.explanationHtml, content.source, processHtml]);

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

  const answers = content.answers;

  // Deduplicate answers by letter, keeping the one with most metadata
  const displayedAnswers = React.useMemo(() => {
    if (!answers) return [];

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
    const uniqueByLetter = new Map<string, (typeof answers)[0]>();
    for (const answer of answers) {
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
  }, [answers]);

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
                  ? "bg-info/10 text-info border-info/20"
                  : "bg-success/10 text-success border-success/20"
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
                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
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
                          <CheckCircle2 className="w-3 h-3 text-success" />
                        ) : (
                          <XCircle className="w-3 h-3 text-destructive" />
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
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
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {/* Question & Vignette Section */}
          <div className="p-6 bg-primary/5 border-y border-primary/10">
            {content.source === "mksap" ? (
              // Truly unified view for MKSAP
              <div className="prose prose-sm max-w-none leading-relaxed text-card-foreground break-words text-base space-y-4 prose-strong:font-bold prose-strong:text-card-foreground prose-b:font-bold prose-b:text-card-foreground">
                {displayVignetteHtml && (
                  <div
                    dangerouslySetInnerHTML={{ __html: displayVignetteHtml }}
                  />
                )}
                <div
                  dangerouslySetInnerHTML={{ __html: processedQuestionStem }}
                />
              </div>
            ) : (
              // Original split view for PeerPrep
              <>
                {displayVignetteHtml && (
                  <div
                    className="prose prose-sm max-w-none leading-relaxed mb-6 text-card-foreground/90 break-words prose-strong:font-bold prose-strong:text-card-foreground prose-b:font-bold prose-b:text-card-foreground"
                    dangerouslySetInnerHTML={{ __html: displayVignetteHtml }}
                  />
                )}

                <div
                  className={cn(
                    "space-y-3",
                    displayVignetteHtml && "pt-6 border-t border-primary/10"
                  )}
                >
                  <span className="text-[10px] font-bold text-card-muted uppercase tracking-widest block">
                    Clinical Question
                  </span>
                  <div
                    className="prose prose-sm max-w-none font-normal text-lg text-card-foreground break-words prose-strong:font-bold prose-strong:text-card-foreground prose-b:font-bold prose-b:text-card-foreground"
                    dangerouslySetInnerHTML={{ __html: processedQuestionStem }}
                  />
                </div>
              </>
            )}

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
          <div className="px-4 py-3 space-y-2">
            {displayedAnswers.map((answer, idx) => {
              const isWrongUserChoice =
                answer.isUserChoice && !answer.isCorrect;
              const isCorrectAnswer = answer.isCorrect;
              const processedAnswerHtml = processHtml(answer.html);

              return (
                <div
                  key={idx}
                  className={cn(
                    "relative flex items-stretch rounded-lg border transition-all",
                    // Base state
                    "border-border/50 bg-card",
                    // Correct answer styling
                    isCorrectAnswer && "border-success/50 bg-success/5",
                    // Wrong user choice
                    isWrongUserChoice &&
                      "border-destructive/50 bg-destructive/5",
                    // User's choice emphasis (subtle)
                    answer.isUserChoice &&
                      "ring-2 ring-offset-1 ring-offset-background",
                    answer.isUserChoice && isCorrectAnswer && "ring-success/40",
                    answer.isUserChoice &&
                      !isCorrectAnswer &&
                      "ring-destructive/40"
                  )}
                >
                  {/* Letter badge */}
                  <div
                    className={cn(
                      "flex items-center justify-center w-12 shrink-0 rounded-l-lg font-bold text-lg",
                      isCorrectAnswer
                        ? "bg-success/15 text-success"
                        : isWrongUserChoice
                        ? "bg-destructive/15 text-destructive"
                        : "bg-muted/30 text-muted-foreground"
                    )}
                  >
                    {answer.letter}
                  </div>

                  {/* Answer content */}
                  <div className="flex-1 px-4 py-3 min-w-0 overflow-hidden">
                    <div
                      className="prose prose-sm max-w-none text-card-foreground [&>p]:m-0 break-words prose-strong:font-bold prose-b:font-bold"
                      dangerouslySetInnerHTML={{ __html: processedAnswerHtml }}
                    />
                  </div>

                  {/* Right side: peer stats + indicators */}
                  <div className="flex items-center gap-3 pr-4 shrink-0">
                    {/* Peer percentage */}
                    {answer.peerPercent !== undefined && (
                      <div className="flex flex-col gap-1.5 min-w-[72px]">
                        <div className="flex items-center justify-end">
                          <span
                            className={cn(
                              "text-xs font-semibold tabular-nums",
                              isCorrectAnswer
                                ? "text-success"
                                : "text-muted-foreground"
                            )}
                          >
                            {answer.peerPercent}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-muted/40 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              isCorrectAnswer
                                ? "bg-success/70"
                                : "bg-muted-foreground/30"
                            )}
                            style={{ width: `${answer.peerPercent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Status indicator */}
                    <div className="flex flex-col items-center gap-0.5 min-w-[48px]">
                      {isCorrectAnswer && (
                        <CheckCircle2 className="w-5 h-5 text-success" />
                      )}
                      {isWrongUserChoice && (
                        <XCircle className="w-5 h-5 text-destructive" />
                      )}
                      {answer.isUserChoice && (
                        <span className="text-[9px] font-bold tracking-wider uppercase text-muted-foreground/70">
                          You
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Explanation Section */}
          <Collapsible
            open={isExplanationOpen}
            onOpenChange={setIsExplanationOpen}
          >
            <div className="border-t border-border">
              <CollapsibleTrigger className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors group">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="flex-1 text-sm font-semibold text-card-foreground text-left">
                  Explanation
                </span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-card-muted transition-transform",
                    isExplanationOpen && "rotate-180"
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                <div className="px-4 pb-6">
                  <div className="rounded-xl bg-card border border-border/50 overflow-hidden">
                    <div
                      className="px-8 py-6 prose prose-sm max-w-none leading-relaxed prose-p:my-6 prose-p:text-card-foreground prose-p:leading-[1.8] prose-strong:text-primary prose-strong:font-bold prose-headings:text-card-foreground prose-headings:font-bold prose-li:text-card-foreground prose-li:my-2 prose-b:text-card-foreground prose-a:text-primary prose-ul:my-5 prose-ol:my-5 break-words"
                      dangerouslySetInnerHTML={{
                        __html: processedExplanation,
                      }}
                    />
                  </div>
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
            >
              <div className="border-t border-border">
                <CollapsibleTrigger className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-warning/15 text-warning shrink-0">
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-sm font-semibold text-card-foreground text-left">
                    Key Points
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-card-muted transition-transform",
                      isKeyPointsOpen && "rotate-180"
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                  <div className="px-4 pb-6">
                    <div className="rounded-xl bg-card border border-warning/20 overflow-hidden">
                      <div className="flex">
                        <div className="w-1 bg-warning shrink-0" />
                        <div
                          className="flex-1 px-5 py-4 prose prose-sm max-w-none prose-p:text-card-foreground prose-li:text-card-foreground prose-li:my-0.5 prose-ul:my-2 prose-p:my-2 prose-headings:text-card-foreground prose-strong:text-card-foreground prose-b:text-card-foreground prose-a:text-primary break-words"
                          dangerouslySetInnerHTML={{
                            __html: processedKeyPoints,
                          }}
                        />
                      </div>
                    </div>
                    {renderImages("keypoint")}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

          {/* Pearls Section */}
          {content.peerPearlsHtml && (
            <Collapsible
              open={isPeerPearlsOpen}
              onOpenChange={setIsPeerPearlsOpen}
            >
              <div className="border-t border-border">
                <CollapsibleTrigger className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-info/15 text-info shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-sm font-semibold text-card-foreground text-left">
                    Pearls
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-card-muted transition-transform",
                      isPeerPearlsOpen && "rotate-180"
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                  <div className="px-4 pb-6">
                    <div className="rounded-xl bg-card border border-info/20 overflow-hidden">
                      <div className="flex">
                        <div className="w-1 bg-info shrink-0" />
                        <div
                          className="flex-1 px-5 py-4 prose prose-sm max-w-none prose-p:text-card-foreground prose-li:text-card-foreground prose-p:my-2 prose-li:my-0.5 prose-headings:text-card-foreground prose-strong:text-card-foreground prose-b:text-card-foreground prose-a:text-primary break-words"
                          dangerouslySetInnerHTML={{
                            __html: processedPeerPearls,
                          }}
                        />
                      </div>
                    </div>
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
            >
              <div className="border-t border-border">
                <CollapsibleTrigger className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50 text-muted-foreground shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-muted-foreground text-left">
                    References
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform",
                      isReferencesOpen && "rotate-180"
                    )}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
                  <div className="px-4 pb-5">
                    <div
                      className="pl-11 prose prose-xs prose-neutral dark:prose-invert max-w-none prose-p:text-muted-foreground prose-li:text-muted-foreground prose-a:text-muted-foreground prose-a:underline-offset-2"
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




