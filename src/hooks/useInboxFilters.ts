import { useState, useMemo } from 'react';
import { parseISO } from 'date-fns';
import { SourceItem, SourceType } from '@/types';
import { getWasCorrect, countBySourceType, groupItemsByDate, DateGroup } from '@/lib/source-item-utils';

export type SortOrder = 'newest' | 'oldest';
export type ResultFilter = 'all' | 'incorrect' | 'correct';

export interface InboxFiltersState {
  searchQuery: string;
  filterSourceType: SourceType | 'all';
  filterResult: ResultFilter;
  sortBy: SortOrder;
}

export interface UseInboxFiltersReturn {
  // State
  filters: InboxFiltersState;
  setSearchQuery: (query: string) => void;
  setFilterSourceType: (type: SourceType | 'all') => void;
  setFilterResult: (result: ResultFilter) => void;
  setSortBy: (order: SortOrder) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;

  // Derived data
  filteredItems: SourceItem[];
  groupedItems: DateGroup[];
  sourceTypeCounts: Record<SourceType, number>;
  visibleIds: string[];
}

/**
 * Hook managing all inbox filter state and derived data.
 * Extracted from InboxView to reduce complexity.
 */
export function useInboxFilters(items: SourceItem[]): UseInboxFiltersReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSourceType, setFilterSourceType] = useState<SourceType | 'all'>('all');
  const [filterResult, setFilterResult] = useState<ResultFilter>('all');
  const [sortBy, setSortBy] = useState<SortOrder>('newest');

  const clearFilters = () => {
    setSearchQuery('');
    setFilterSourceType('all');
    setFilterResult('all');
  };

  const hasActiveFilters = searchQuery !== '' || filterSourceType !== 'all' || filterResult !== 'all';

  const sourceTypeCounts = useMemo(() => countBySourceType(items), [items]);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // Search filter
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());

        // Source type filter
        const matchesType = filterSourceType === 'all' || item.sourceType === filterSourceType;

        // Result filter (qbank only)
        let matchesResult = true;
        if (filterResult !== 'all') {
          const wasCorrect = getWasCorrect(item);
          if (wasCorrect === null) {
            matchesResult = false;
          } else {
            matchesResult = filterResult === 'correct' ? wasCorrect : !wasCorrect;
          }
        }

        return matchesSearch && matchesType && matchesResult;
      })
      .sort((a, b) => {
        const dateA = parseISO(a.createdAt).getTime();
        const dateB = parseISO(b.createdAt).getTime();
        return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
      });
  }, [items, searchQuery, filterSourceType, filterResult, sortBy]);

  const groupedItems = useMemo(
    () => groupItemsByDate(filteredItems, sortBy),
    [filteredItems, sortBy]
  );

  const visibleIds = useMemo(() => filteredItems.map((i) => i.id), [filteredItems]);

  return {
    filters: { searchQuery, filterSourceType, filterResult, sortBy },
    setSearchQuery,
    setFilterSourceType,
    setFilterResult,
    setSortBy,
    clearFilters,
    hasActiveFilters,
    filteredItems,
    groupedItems,
    sourceTypeCounts,
    visibleIds,
  };
}
