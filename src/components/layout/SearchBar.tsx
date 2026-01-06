'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, FileText, CreditCard, Inbox } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { SearchFilter, SearchResult, SearchResultItem } from '@/types';
import { useAppStore } from "@/stores/useAppStore";

const FILTER_OPTIONS: { value: SearchFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: null },
  { value: 'cards', label: 'Cards', icon: <CreditCard className="h-3 w-3" /> },
  { value: 'notes', label: 'Notes', icon: <FileText className="h-3 w-3" /> },
  { value: 'inbox', label: 'Inbox', icon: <Inbox className="h-3 w-3" /> },
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
    case 'card': return <CreditCard className="h-4 w-4 text-purple-400" />;
    case 'note': return <FileText className="h-4 w-4 text-blue-400" />;
    case 'source_item': return <Inbox className="h-4 w-4 text-amber-400" />;
  }
}

export function SearchBar() {
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Debounced search
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
        setSelectedIndex(0);
      }
    } catch (error) {
      console.error('[Search] Query failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(query, filter);
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, filter, performSearch]);

  // Global Ctrl+F shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || !results?.results.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, results.results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        handleResultClick(results.results[selectedIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleResultClick = (result: SearchResultItem) => {
    console.log("[Search] Navigating to:", result.type, result.id);

    switch (result.type) {
      case "card":
        // TODO: Reroute to card browser/notebook when implemented.
        // For now, it opens the review interface with the card context.
        setCurrentView("review", result.id);
        break;
      case "note":
        setCurrentView("notebook", result.id);
        break;
      case "source_item":
        setCurrentView("inbox", result.id);
        break;
      default:
        console.warn("[Search] Unknown result type:", result.type);
    }

    setIsOpen(false);
    setQuery('');
  };

  const handleClear = () => {
    setQuery('');
    setResults(null);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input */}
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search... (Ctrl+F)"
          className="w-full pl-9 pr-8 h-9 bg-black/30 border-white/10 focus-visible:ring-primary/30 focus-visible:bg-black/40 focus-visible:border-primary/20 text-foreground placeholder:text-muted-foreground/40 text-sm rounded-lg"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Filter Chips */}
          <div className="flex gap-1 p-2 border-b border-border bg-muted/30">
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                  filter === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
              >
                {opt.icon}
                {opt.label}
                {results?.counts && (
                  <span className="ml-1 opacity-70">
                    ({results.counts[opt.value]})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Results List */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                Searching...
              </div>
            ) : results?.results.length ? (
              results.results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left px-3 py-2 flex items-start gap-3 transition-colors ${
                    index === selectedIndex ? 'bg-muted' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="mt-0.5">{getResultIcon(result.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {result.title}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {highlightSnippet(result.snippet)}
                    </div>
                    {result.tags && result.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {result.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No results found
              </div>
            )}
          </div>

          {/* Footer with performance info */}
          {results && (
            <div className="px-3 py-1.5 border-t border-border bg-muted/30 text-xs text-muted-foreground flex justify-between">
              <span>{results.counts.all} results</span>
              <span>{results.queryTimeMs.toFixed(1)}ms</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
