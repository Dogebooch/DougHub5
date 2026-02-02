/**
 * SimulatorCard
 *
 * Clinical vignette presentation for the Simulator.
 * Presents an entity as a clinical scenario, requiring the user
 * to identify the condition/concept.
 *
 * Part of the "Deep Dive" escape hatch from card purgatory.
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Stethoscope,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Brain,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface SimulatorCardProps {
  entityId: string;
  entityTitle: string;
  entityType: string;
  vignette: string;
  goldenTicketHint?: string;
  onCorrect: () => void;
  onIncorrect: (userAnswer: string) => void;
  onSkip: () => void;
  showingResult?: boolean;
  wasCorrect?: boolean;
}

export const SimulatorCard: React.FC<SimulatorCardProps> = ({
  entityTitle,
  entityType,
  vignette,
  goldenTicketHint,
  onCorrect,
  onIncorrect,
  onSkip,
  showingResult = false,
  wasCorrect,
}) => {
  const [userAnswer, setUserAnswer] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Timer countdown
  useEffect(() => {
    if (!isTimerRunning || showingResult) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, showingResult]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle submission
  const handleSubmit = () => {
    // Simple check: does user answer contain the entity title?
    // In production, this would use AI grading
    const isCorrect = userAnswer
      .toLowerCase()
      .includes(entityTitle.toLowerCase());

    if (isCorrect) {
      onCorrect();
    } else {
      onIncorrect(userAnswer);
    }
  };

  // Determine urgency color based on time
  const getTimeColor = () => {
    if (timeRemaining > 60) return "text-emerald-400";
    if (timeRemaining > 30) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <Card className="max-w-2xl mx-auto border-primary/30 bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <CardHeader className="border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Clinical Simulator</CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs">
              {entityType.replace("_", " ")}
            </Badge>
            <div
              className={`flex items-center gap-1 text-sm font-mono ${getTimeColor()}`}
            >
              <Clock className="w-4 h-4" />
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>
        {/* Progress bar for time */}
        <Progress value={(timeRemaining / 120) * 100} className="h-1 mt-2" />
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Vignette */}
        <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {vignette}
          </p>
        </div>

        {/* Question */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            What is the most likely diagnosis?
          </label>
          <Textarea
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Type your answer..."
            className="min-h-[80px]"
            disabled={showingResult}
          />
        </div>

        {/* Hint Toggle */}
        {goldenTicketHint && !showingResult && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHint(!showHint)}
              className="text-xs text-muted-foreground"
            >
              <Eye className="w-3 h-3 mr-1" />
              {showHint ? "Hide Hint" : "Reveal Hint (counts as partial)"}
            </Button>
            {showHint && (
              <div className="mt-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-warning">
                  <Sparkles className="w-4 h-4" />
                  <span>{goldenTicketHint}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Result Display */}
        {showingResult && (
          <div
            className={`p-4 rounded-lg border ${
              wasCorrect
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-red-500/10 border-red-500/30"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {wasCorrect ? (
                <>
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="font-medium text-emerald-400">Correct!</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-400" />
                  <span className="font-medium text-red-400">Incorrect</span>
                </>
              )}
            </div>
            <p className="text-sm">
              <span className="text-muted-foreground">Answer: </span>
              <span className="font-medium">{entityTitle}</span>
            </p>
            {goldenTicketHint && (
              <p className="text-sm mt-1 text-muted-foreground">
                Key discriminator: {goldenTicketHint}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <Button
            variant="ghost"
            onClick={onSkip}
            className="text-muted-foreground"
          >
            Skip
          </Button>

          {!showingResult ? (
            <Button
              onClick={handleSubmit}
              disabled={userAnswer.trim().length === 0}
              className="bg-primary hover:bg-primary/90"
            >
              <Brain className="w-4 h-4 mr-2" />
              Submit Answer
            </Button>
          ) : (
            <Button onClick={onSkip} className="bg-primary hover:bg-primary/90">
              <ArrowRight className="w-4 h-4 mr-2" />
              Next
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SimulatorCard;
