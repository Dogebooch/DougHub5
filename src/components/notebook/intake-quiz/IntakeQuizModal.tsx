import React, { useState, useEffect } from 'react';
import {
  Brain,
  BookOpen,
  Lightbulb,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getIntakeFlow, type IntakeFlowType } from "@/lib/intake-flow";
import { ReferenceMode } from "./ReferenceMode";
import { TakeawaysMode } from "./TakeawaysMode";
import { FullQuizMode } from "./FullQuizMode";

interface IntakeQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceItem: {
    id: string;
    title: string;
    content: string;
    sourceType: string;
    correctness?: 'correct' | 'incorrect' | null;
  };
  suggestedTopics?: string[];
  onComplete: (result: {
    selectedTopicIds: string[];
    blocksCreated: number;
    cardsCreated: number;
  }) => void;
}

export const IntakeQuizModal: React.FC<IntakeQuizModalProps> = ({
  isOpen,
  onClose,
  sourceItem,
  suggestedTopics = [],
  onComplete,
}) => {
  const [flowType, setFlowType] = useState<IntakeFlowType>('full_quiz');

  // Detect flow type on mount or when source changes
  useEffect(() => {
    if (isOpen) {
      const flow = getIntakeFlow(sourceItem.sourceType);
      setFlowType(flow);
    }
  }, [isOpen, sourceItem.sourceType]);

  const handleComplete = (result: {
    selectedTopicIds: string[];
    blocksCreated: number;
    cardsCreated: number;
  }) => {
    onComplete(result);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 border-b bg-muted/30 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              {flowType === 'full_quiz' && <Brain className="w-4 h-4" />}
              {flowType === 'reference' && <BookOpen className="w-4 h-4" />}
              {flowType === 'takeaways' && <Lightbulb className="w-4 h-4" />}
            </div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
              Intake Flow: {flowType.replace('_', ' ')}
            </span>
          </div>
          
          <DialogTitle className="text-xl leading-tight">
            {flowType === 'full_quiz' && 'Board Concept Intake'}
            {flowType === 'reference' && 'Library Reference'}
            {flowType === 'takeaways' && 'Key Takeaways'}
          </DialogTitle>
          
          <DialogDescription className="line-clamp-1 border-l-2 border-primary/20 pl-2 mt-1">
            {sourceItem.title}
          </DialogDescription>
        </DialogHeader>

        {flowType === 'reference' && (
          <ReferenceMode
            sourceItem={sourceItem}
            suggestedTopics={suggestedTopics}
            onComplete={handleComplete}
            onCancel={onClose}
          />
        )}

        {flowType === 'takeaways' && (
          <TakeawaysMode
            sourceItem={sourceItem}
            suggestedTopics={suggestedTopics}
            onComplete={handleComplete}
            onCancel={onClose}
          />
        )}

        {flowType === 'full_quiz' && (
          <FullQuizMode
            sourceItem={sourceItem}
            suggestedTopics={suggestedTopics}
            onComplete={handleComplete}
            onCancel={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
