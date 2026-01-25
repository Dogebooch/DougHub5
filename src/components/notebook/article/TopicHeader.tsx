import React from 'react';
import { Layers, FileText, Clock } from 'lucide-react';

interface TopicHeaderProps {
  title: string;
  aliases?: string[];       // Alternative names for this topic
  cardCount: number;
  sourceCount: number;      // Number of unique sources/blocks
  lastUpdated: string;      // ISO date string
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

export function TopicHeader({
  title,
  aliases,
  cardCount,
  sourceCount,
  lastUpdated
}: TopicHeaderProps) {
  return (
    <header className="mb-8">
      <h1 className="text-3xl font-bold text-foreground mb-2">
        {title}
      </h1>
      
      {aliases && aliases.length > 0 && (
        <p className="text-muted-foreground italic mb-3">
          Also known as: {aliases.join(", ")}
        </p>
      )}
      
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Layers className="h-4 w-4" />
          {cardCount} cards
        </span>
        <span className="flex items-center gap-1">
          <FileText className="h-4 w-4" />
          {sourceCount} sources
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          Updated {formatRelativeTime(lastUpdated)}
        </span>
      </div>
    </header>
  );
}
