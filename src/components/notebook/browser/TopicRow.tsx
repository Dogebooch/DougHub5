import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronRight, Layers, AlertTriangle } from 'lucide-react';

interface TopicRowProps {
  id: string;
  name: string;
  cardCount: number;
  blockCount: number;
  accuracy?: number;        // 0-100, optional
  updatedAt?: string;       // ISO date string OR relative time string
  isStrugglingTopic?: boolean;
  onSelect: (id: string) => void;
  onViewCards?: (id: string) => void;
}

export const TopicRow: React.FC<TopicRowProps> = ({
  id,
  name,
  cardCount,
  blockCount,
  accuracy,
  updatedAt,
  isStrugglingTopic,
  onSelect,
  onViewCards,
}) => {
  return (
    <button
      onClick={() => onSelect(id)}
      className={cn(
        "group w-full text-left transition-colors duration-200",
        "px-4 py-2.5 rounded-lg",
        "bg-notebook-card text-notebook-text",
        "hover:bg-white/5",
        "flex items-center justify-between"
      )}
    >
      <div className="flex items-center gap-3 overflow-hidden flex-1">
        <span className="truncate font-medium">{name}</span>
        
        {isStrugglingTopic && (
          <AlertTriangle 
            size={14} 
            className="text-notebook-trap shrink-0 animate-pulse" 
          />
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0 px-2">
        {/* Stats Badges - Always visible */}
        <div className="flex items-center gap-2">
          {updatedAt && (
            <span className="text-[11px] text-notebook-muted font-normal mr-2 hidden sm:inline whitespace-nowrap">
              {updatedAt}
            </span>
          )}
          {accuracy !== undefined && (
            <Badge variant="outline" className="bg-transparent text-notebook-muted border-notebook-muted/20">
              {Math.round(accuracy)}%
            </Badge>
          )}
          <Badge variant="outline" className="bg-transparent text-notebook-muted border-notebook-muted/20 whitespace-nowrap">
            {cardCount} {cardCount === 1 ? 'card' : 'cards'}
          </Badge>
        </div>

        {/* Hover Actions - Fade in */}
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2.5 text-notebook-text hover:bg-white/10"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(id);
            }}
          >
            Open
            <ChevronRight size={14} className="ml-1" />
          </Button>

          {onViewCards && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2.5 text-notebook-muted hover:text-notebook-text hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                onViewCards(id);
              }}
            >
              <Layers size={14} className="mr-1.5" />
              Cards
            </Button>
          )}
        </div>
      </div>
    </button>
  );
};
