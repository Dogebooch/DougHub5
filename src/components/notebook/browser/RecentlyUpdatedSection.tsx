import React from 'react';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { Clock, ChevronDown } from "lucide-react";
import { TopicRow } from "./TopicRow";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RecentlyUpdatedSectionProps {
  topics: Array<{
    id: string;
    name: string;
    cardCount: number;
    blockCount: number;
    updatedAt: string;
  }>;
  onSelectTopic: (id: string) => void;
  onViewCards?: (id: string) => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  return `${diffDays}d ago`;
}

export const RecentlyUpdatedSection: React.FC<RecentlyUpdatedSectionProps> = ({
  topics,
  onSelectTopic,
  onViewCards,
}) => {
  if (topics.length === 0) return null;

  return (
    <section className="mb-6">
      <Collapsible defaultOpen className="group/collapsible">
        <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg py-2 text-left hover:bg-muted/50 transition-colors">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recently Updated
          </span>
          <Badge 
            variant="secondary" 
            className="h-5 px-1.5 text-[0.65rem] font-bold"
          >
            {topics.length}
          </Badge>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=closed]/collapsible:-rotate-90" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-1">
            {topics.map((topic) => (
              <TopicRow
                key={topic.id}
                id={topic.id}
                name={topic.name}
                cardCount={topic.cardCount}
                blockCount={topic.blockCount}
                updatedAt={formatRelativeTime(topic.updatedAt)}
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
