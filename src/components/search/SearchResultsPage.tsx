'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, FileText, CreditCard, Inbox, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { SearchFilter, SearchResult, SearchResultItem } from '@/types';

const FILTER_OPTIONS: { value: SearchFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: null },
  { value: 'cards', label: 'Cards', icon: <CreditCard className="h-3.5 w-3.5" /> },
  { value: 'notes', label: 'Notes', icon: <FileText className="h-3.5 w-3.5" /> },
  { value: 'inbox', label: 'Inbox', icon: <Inbox className="h-3.5 w-3.5" /> },
];

function highlightSnippet(snippet: string): React.ReactNode {
  const parts = snippet.split(/(<mark>|<\/mark>)/);
  let inMark = false;
  return parts.map((part, i) => {
    if (part === '<mark>') { inMark = true; return null; }
    if (part === '</mark>') { inMark = false; return null; }
    if (inMark) return <mark key={i} className="bg-primary/30 text-foreground rounded px-0.5">{part}</mark>;
    return <span key={i}>{part}</span>;
  });
}

function getResultIcon(type: SearchResultItem['type']) {
  switch (type) {
    case 'card': return <CreditCard className="h-5 w-5 text-purple-400" />;
    case 'note': return <FileText className="h-5 w-5 text-blue-400" />;
    case 'source_item': return <Inbox className="h-5 w-5 text-amber-400" />;
  }
}

function getTypeLabel(type: SearchResultItem['type']) {
  switch (type) {
    case 'card': return 'Card';
    case 'note': return 'Note';
    case 'source_item': return 'Inbox Item';
  }
}

interface SearchResultsPageProps {
  initialQuery?: string;
  onBack?: () => void;
  onResultSelect?: (result: SearchResultItem) => void;
}

export function SearchResultsPage({
  initialQuery = '',
  onBack,
  onResultSelect
}: SearchResultsPageProps) {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const performSearch = useCallback(async (searchQuery: string, searchFilter: SearchFilter) => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    try {
      const result = await window.api.search.query(searchQuery, searchFilter);
      if (result.data) {
        setResults(result.data);
      }
    } catch (error) {
      console.error('[Search] Query failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search on query/filter change
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query, filter);
    }, 150);
    return () => clearTimeout(timer);
  }, [query, filter, performSearch]);

  const handleResultClick = (result: SearchResultItem) => {
    if (onResultSelect) {
      onResultSelect(result);
    } else {
      console.log('[Search] Selected:', result);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-3 mb-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-xl font-semibold">Search</h1>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search cards, notes, and inbox..."
            className="pl-10 h-11"
            autoFocus
          />
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 mt-3">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              {opt.icon}
              {opt.label}
              {results?.counts && (
                <span className="ml-1 opacity-70">
                  {results.counts[opt.value]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            Searching...
          </div>
        ) : !query.trim() ? (
          <div className="p-8 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Enter a search term to find cards, notes, and inbox items</p>
            <p className="text-sm mt-2">Use #tag to filter by tag</p>
          </div>
        ) : results?.results.length ? (
          <div className="divide-y divide-border">
            {results.results.map(result => (
              <button
                key={result.id}
                onClick={() => handleResultClick(result)}
                className="w-full text-left p-4 flex items-start gap-4 hover:bg-muted/50 transition-colors"
              >
                <div className="mt-0.5">{getResultIcon(result.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-medium text-foreground truncate">
                      {result.title}
                    </span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground shrink-0">
                      {getTypeLabel(result.type)}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-2">
                    {highlightSnippet(result.snippet)}
                  </div>
                  {result.tags && result.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {result.tags.map(tag => (
                        <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground/60 mt-2">
                    {new Date(result.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <p>No results found for "{query}"</p>
            <p className="text-sm mt-2">Try different keywords or remove filters</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {results && (
        <div className="border-t border-border px-4 py-2 text-sm text-muted-foreground flex justify-between">
          <span>{results.counts.all} results</span>
          <span>Query: {results.queryTimeMs.toFixed(1)}ms</span>
        </div>
      )}
    </div>
  );
}
