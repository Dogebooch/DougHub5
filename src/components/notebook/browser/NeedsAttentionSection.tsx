import React from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { TopicRow } from './TopicRow';

interface NeedsAttentionSectionProps {
  topics: Array<{
    id: string;
    name: string;
    cardCount: number;
    blockCount: number;
    accuracy?: number;
    isStrugglingTopic: boolean;
  }>;
  onSelectTopic: (id: string) => void;
  onViewCards?: (id: string) => void;
}

export const NeedsAttentionSection: React.FC<NeedsAttentionSectionProps> = ({
  topics,
  onSelectTopic,
  onViewCards,
}) => {
  if (topics.length === 0) return null;

  return (
    <section className="mb-6">
      <Collapsible defaultOpen className="group/collapsible">
        <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg py-2 text-left hover:bg-muted/50 transition-colors">
          <AlertTriangle className="h-4 w-4 text-notebook-trap" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Needs Attention
          </span>
          <Badge 
            variant="secondary" 
            className="h-5 px-1.5 text-[0.65rem] font-bold bg-notebook-trap/10 text-notebook-trap border-notebook-trap/20"
          >
            {topics.length}
          </Badge>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=closed]/collapsible:-rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 rounded-md bg-notebook-trap/5 border-l-2 border-notebook-trap overflow-hidden">
            {topics.map(topic => (
              <TopicRow 
                key={topic.id} 
                {...topic} 
                isStrugglingTopic={true}
                onSelect={onSelectTopic} 
                onViewCards={onViewCards}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
};
