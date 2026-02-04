import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Brain, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { getAdvisorAnalysis } from "@/lib/api/advisor";
import { AdvisorResult } from "../../../electron/ai/tasks/advisor-task";

interface AdvisorPanelProps {
  content: string;
  userNotes: string;
  sourceType: string;
  sourceItemId: string;
}

export const AdvisorPanel: React.FC<AdvisorPanelProps> = ({
  content,
  userNotes,
  sourceType,
  sourceItemId,
}) => {
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const analysis = await getAdvisorAnalysis(content, userNotes, sourceType);
      setResult(analysis);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const relevanceColor = {
    board_high_yield: "bg-green-100 text-green-800 border-green-200",
    clinical_reference: "bg-blue-100 text-blue-800 border-blue-200",
    low_yield: "bg-gray-100 text-gray-800 border-gray-200",
  } as const;

  const relevanceLabel = {
    board_high_yield: "Board High-Yield",
    clinical_reference: "Clinical Reference",
    low_yield: "Low Yield",
  } as const;

  if (!result && !loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-full text-muted-foreground space-y-4">
        <div className="bg-primary/10 p-3 rounded-full">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="font-medium text-foreground">AI Study Advisor</h3>
          <p className="text-sm max-w-xs mx-auto">
            Analyze your notes and content to get flashcard strategies and
            filing suggestions.
          </p>
        </div>
        <Button onClick={handleAnalyze} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Get Strategy
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Analyzing content strategy...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center space-y-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={handleAnalyze}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          Advisor Strategy
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleAnalyze}
          title="Re-analyze"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4 space-y-6">
        {result && (
          <>
            {/* Verdict */}
            <div
              className={`p-3 rounded-lg border flex flex-col items-center text-center space-y-2 ${relevanceColor[result.relevance]}`}
            >
              <span className="text-xs font-semibold uppercase tracking-wider opacity-70">
                Verdict
              </span>
              <span className="font-bold text-lg">
                {relevanceLabel[result.relevance]}
              </span>
            </div>

            {/* Application */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Concept Summary
              </h4>
              <p className="text-sm leading-relaxed">{result.summary}</p>
            </div>

            {/* Filing */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Recommended Filing
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {result.filingPath.map((path, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="font-mono text-xs"
                  >
                    {path}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Strategy / Card Recs */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Flashcard Strategy
              </h4>
              <div className="grid gap-3">
                {result.cardRecommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="border rounded-md p-3 bg-card space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="capitalize">
                        {rec.type.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground italic">
                      "{rec.contentSuggestion}"
                    </p>
                    <p className="text-xs text-muted-foreground border-t pt-2 mt-2">
                      {rec.rationale}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* General Advice */}
            <div className="bg-muted/30 p-3 rounded-md border space-y-1">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                Advisor Note
              </h4>
              <p className="text-sm text-muted-foreground">{result.advice}</p>
            </div>
          </>
        )}
      </ScrollArea>

      {/* Export Footer */}
      {result && (
        <div className="p-4 border-t bg-muted/5">
          <Button
            className="w-full gap-2"
            variant="default"
            onClick={async () => {
              // Note: Assuming export API is wired up via window.api
              // Since AdvisorPanel is deeply nested, we might need a dedicated API helper call here
              // For now, we'll try to use the raw IPC call if available, or just log
              try {
                // @ts-ignore
                const res = await window.api.remnote.export(
                  sourceItemId,
                  result,
                );
                if (res.error) throw new Error(res.error);
                // Success feedback (toast would be nice)
                console.log("Exported to RemNote!");
              } catch (e) {
                console.error("Export failed", e);
                // In real app, show error toast
              }
            }}
          >
            <ExternalLink className="h-4 w-4" />
            Export to RemNote
          </Button>
        </div>
      )}
    </div>
  );
};
