import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronRight, SortAsc, BookText } from 'lucide-react';
import { TopicRow } from './TopicRow';

interface Topic {
  id: string;
  name: string;
  domain: string | null;
  cardCount: number;
  blockCount: number;
  accuracy?: number;
  updatedAt?: string;
  isStrugglingTopic?: boolean;
}

interface DomainGroupedTopicsProps {
  topics: Topic[];
  onSelectTopic: (id: string) => void;
  onViewCards?: (id: string) => void;
}

/**
 * Groups topics by their domain field.
 * Topics with a null/empty domain are grouped under "Uncategorized".
 * Domains are sorted alphabetically, with "Uncategorized" always appearing last.
 */
function groupByDomain(topics: Topic[]): Map<string, Topic[]> {
  const groups = new Map<string, Topic[]>();
  
  for (const topic of topics) {
    const domain = topic.domain || "Uncategorized";
    if (!groups.has(domain)) {
      groups.set(domain, []);
    }
    groups.get(domain)!.push(topic);
  }

  const sortedEntries = [...groups.entries()].sort((a, b) => {
    if (a[0] === "Uncategorized") return 1;
    if (b[0] === "Uncategorized") return -1;
    return a[0].localeCompare(b[0]);
  });

  return new Map(sortedEntries);
}

export const DomainGroupedTopics: React.FC<DomainGroupedTopicsProps> = ({
  topics,
  onSelectTopic,
  onViewCards,
}) => {
  const groupedTopics = useMemo(() => groupByDomain(topics), [topics]);

  if (topics.length === 0) {
    return (
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookText className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              All Topics
            </span>
          </div>
        </div>
        <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground/50 text-xs">
          No topics available.
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BookText className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            All Topics
          </span>
          <Badge variant="secondary" className="h-5 px-1.5 text-[0.65rem] font-bold">
            {topics.length}
          </Badge>
        </div>
        <button 
          className="p-1 hover:bg-muted rounded-md text-muted-foreground transition-colors"
          title="Sort A-Z"
        >
          <SortAsc className="h-3.5 w-3.5" />
        </button>
      </div>
      
      <div className="space-y-1">
        {[...groupedTopics.entries()].map(([domain, domainTopics]) => (
          <Collapsible key={domain} defaultOpen className="group/collapsible">
            <CollapsibleTrigger className="flex items-center w-full py-1.5 px-2 hover:bg-muted/50 rounded-md transition-colors text-left group">
              <ChevronRight className="h-3.5 w-3.5 mr-2 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              <span className="font-semibold text-xs text-foreground/80">{domain}</span>
              <Badge 
                variant="outline" 
                className="ml-auto text-[10px] px-1 h-4 font-normal bg-transparent border-muted-foreground/20"
              >
                {domainTopics.length}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden">
              <div className="pl-4 py-1 ml-3 border-l border-muted/30 space-y-0.5">
                {domainTopics.map(topic => (
                  <TopicRow 
                    key={topic.id} 
                    {...topic} 
                    onSelect={onSelectTopic} 
                    onViewCards={onViewCards}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </section>
  );
};
