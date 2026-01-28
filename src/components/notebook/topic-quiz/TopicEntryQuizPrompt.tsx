import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Brain, SkipForward } from "lucide-react";

interface TopicEntryQuizPromptProps {
  isOpen: boolean;
  onClose: () => void;
  topicName: string;
  daysSince: number;
  onStartQuiz: () => void;
  onSkip: () => void;
}

/**
 * TopicEntryQuizPrompt
 *
 * Shown when user returns to a topic after 7+ days.
 * Offers a quick retention quiz before viewing content.
 */
export function TopicEntryQuizPrompt({
  isOpen,
  onClose,
  topicName,
  daysSince,
  onStartQuiz,
  onSkip,
}: TopicEntryQuizPromptProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Welcome back!
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            It's been <span className="font-semibold text-foreground">{daysSince} days</span> since
            you visited <span className="font-semibold text-foreground">{topicName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Quick 3-question check to see what you remember? Takes about 1 minute.
          </p>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={onSkip}
            className="gap-2"
          >
            <SkipForward className="h-4 w-4" />
            Skip for now
          </Button>
          <Button
            onClick={onStartQuiz}
            className="gap-2"
          >
            <Brain className="h-4 w-4" />
            Start Quiz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
