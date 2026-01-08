import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  ChevronDown,
  Clock,
  ExternalLink
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { BoardQuestionContent } from "@/types";
import { cn } from "@/lib/utils";

interface BoardQuestionViewProps {
  content: BoardQuestionContent;
  className?: string;
}

export const BoardQuestionView: React.FC<BoardQuestionViewProps> = ({ content, className }) => {
  const [isAttemptsOpen, setIsAttemptsOpen] = useState(false);
  const [isExplanationOpen, setIsExplanationOpen] = useState(true);
  const [isKeyPointsOpen, setIsKeyPointsOpen] = useState(true);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const renderImages = (location: 'vignette' | 'explanation' | 'keypoint') => {
    const sectionImages = content.images.filter(img => img.location === location);
    if (sectionImages.length === 0) return null;

    return (
      <div className="mt-4 space-y-4">
        {sectionImages.map((img, idx) => (
          <div key={idx} className="flex flex-col items-center">
            <img 
              src={img.localPath} 
              alt={img.caption || `Image ${idx + 1}`} 
              className="max-w-full h-auto rounded-md shadow-sm border border-border"
            />
            {img.caption && (
              <p className="text-xs text-muted-foreground mt-2 italic text-center">
                {img.caption}
              </p>
            )}
          </div>
        ))}
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
                content.source === 'peerprep' ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              )}
            >
              {content.source === 'peerprep' ? 'PeerPrep' : 'MKSAP'}
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
              <Collapsible open={isAttemptsOpen} onOpenChange={setIsAttemptsOpen}>
                <CollapsibleTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className="cursor-pointer hover:bg-muted ml-2 transition-colors flex items-center gap-1"
                  >
                    <Clock className="w-3 h-3" />
                    Attempts ({content.attempts.length})
                    <ChevronDown className={cn("w-3 h-3 transition-transform", isAttemptsOpen && "rotate-180")} />
                  </Badge>
                </CollapsibleTrigger>
              </Collapsible>
            )}
          </div>

          <div className="flex items-center gap-2">
            {content.wasCorrect ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <XCircle className="w-5 h-5 text-red-500" />
            )}
            <a 
              href={content.sourceUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Attempts History */}
        {content.attempts && content.attempts.length > 0 && isAttemptsOpen && (
          <div className="mt-3 p-3 bg-muted/50 rounded-md border border-border text-xs space-y-2">
            <h4 className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Attempt History</h4>
            {[...content.attempts].reverse().map((attempt, idx) => (
              <div key={idx} className="flex items-center justify-between border-b border-border/50 pb-1 last:border-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Attempt {attempt.attemptNumber}</span>
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
          <div className="p-6">
            <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase block mb-3">Vignette</span>
            <div 
              className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed"
              dangerouslySetInnerHTML={{ __html: content.vignetteHtml }} 
            />
            {renderImages('vignette')}
          </div>

          {/* Question Stem Section */}
          <div className="p-6 bg-muted/10">
            <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase block mb-3">Question</span>
            <div 
              className="prose prose-sm dark:prose-invert max-w-none font-semibold text-foreground text-md"
              dangerouslySetInnerHTML={{ __html: content.questionStemHtml }} 
            />
          </div>

          {/* Answers Section */}
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground text-left">
                  <th className="px-4 py-2 font-medium w-12 text-center">Res</th>
                  <th className="px-2 py-2 font-medium w-10">Ltr</th>
                  <th className="px-4 py-2 font-medium">Answer Option</th>
                  <th className="px-4 py-2 font-medium w-32">Peers</th>
                  <th className="px-4 py-2 font-medium w-12 text-center">You</th>
                </tr>
              </thead>
              <tbody>
                {content.answers.map((answer, idx) => {
                  const isWrongUserChoice = answer.isUserChoice && !answer.isCorrect;
                  const isCorrectAnswer = answer.isCorrect;
                  
                  return (
                    <tr 
                      key={idx} 
                      className={cn(
                        "border-t border-border group transition-colors",
                        isCorrectAnswer && "bg-green-50/50 dark:bg-green-950/20",
                        isWrongUserChoice && "bg-red-50/50 dark:bg-red-950/20",
                        !isCorrectAnswer && !isWrongUserChoice && "hover:bg-muted/30"
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
                          className="prose prose-sm dark:prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: answer.html }} 
                        />
                      </td>
                      <td className="px-4 py-3 align-middle">
                        {answer.peerPercent !== undefined && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-medium leading-none">{answer.peerPercent}%</span>
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
          <Collapsible open={isExplanationOpen} onOpenChange={setIsExplanationOpen} className="p-0">
            <div className="border-t border-border">
              <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Explanation</span>
                <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isExplanationOpen && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-6 pb-6 pt-0">
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none text-foreground border-l-2 border-primary/20 pl-4 py-1"
                    dangerouslySetInnerHTML={{ __html: content.explanationHtml }} 
                  />
                  {renderImages('explanation')}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Key Points Section */}
          {content.keyPointsHtml && (
            <Collapsible open={isKeyPointsOpen} onOpenChange={setIsKeyPointsOpen} className="p-0">
              <div className="border-t border-border">
                <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left">
                  <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase text-amber-600 dark:text-amber-400">Key Points</span>
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isKeyPointsOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-6 pb-6 pt-0">
                    <div className="bg-amber-50/30 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/50 rounded-lg p-4">
                      <div 
                        className="prose prose-sm dark:prose-invert max-w-none text-foreground"
                        dangerouslySetInnerHTML={{ __html: content.keyPointsHtml }} 
                      />
                    </div>
                    {renderImages('keypoint')}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
