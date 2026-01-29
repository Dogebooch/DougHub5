import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SourceType } from '@/types';
import { SortOrder, ResultFilter } from '@/hooks/useInboxFilters';

interface InboxToolbarProps {
  // Filter state
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: SortOrder;
  onSortChange: (order: SortOrder) => void;
  filterSourceType: SourceType | 'all';
  onSourceTypeChange: (type: SourceType | 'all') => void;
  filterResult: ResultFilter;
  onResultChange: (result: ResultFilter) => void;
  sourceTypeCounts: Record<SourceType, number>;
  hasActiveFilters: boolean;
  onClearFilters: () => void;

  // Selection state
  isAllSelected: boolean;
  isAnySelected: boolean;
  onSelectAllToggle: () => void;
}

/**
 * Inbox toolbar with search, sort, filters, and select-all controls.
 */
export function InboxToolbar({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  filterSourceType,
  onSourceTypeChange,
  filterResult,
  onResultChange,
  sourceTypeCounts,
  hasActiveFilters,
  onClearFilters,
  isAllSelected,
  isAnySelected,
  onSelectAllToggle,
}: InboxToolbarProps) {
  return (
    <div className="bg-surface-elevated/30 p-4 rounded-xl border border-border/50 shadow-sm backdrop-blur-sm space-y-3">
      {/* Row 1: Search + Order */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <Input
            id="search"
            placeholder="Filter by title..."
            className="pl-9 bg-background/50 border-border/10 ring-offset-background transition-all focus-visible:ring-1 focus-visible:ring-primary/30 h-9"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <RadioGroup
          value={sortBy}
          onValueChange={(v) => onSortChange(v as SortOrder)}
          className="flex items-center gap-3"
        >
          <div className="flex items-center space-x-1.5">
            <RadioGroupItem value="newest" id="newest" className="h-3.5 w-3.5" />
            <Label htmlFor="newest" className="text-xs font-medium cursor-pointer whitespace-nowrap">
              Newest
            </Label>
          </div>
          <div className="flex items-center space-x-1.5">
            <RadioGroupItem value="oldest" id="oldest" className="h-3.5 w-3.5" />
            <Label htmlFor="oldest" className="text-xs font-medium cursor-pointer whitespace-nowrap">
              Oldest
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Row 2: Filters + Select */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Source:</span>
          <Select
            value={filterSourceType}
            onValueChange={(v) => onSourceTypeChange(v as SourceType | 'all')}
          >
            <SelectTrigger className="w-[140px] bg-background/50 border-border/10 h-8 text-xs">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="qbank">QBank ({sourceTypeCounts.qbank})</SelectItem>
              <SelectItem value="article">Article ({sourceTypeCounts.article})</SelectItem>
              <SelectItem value="pdf">PDF ({sourceTypeCounts.pdf})</SelectItem>
              <SelectItem value="image">Image ({sourceTypeCounts.image})</SelectItem>
              <SelectItem value="audio">Audio ({sourceTypeCounts.audio})</SelectItem>
              <SelectItem value="quickcapture">Quick Capture ({sourceTypeCounts.quickcapture})</SelectItem>
              <SelectItem value="manual">Manual ({sourceTypeCounts.manual})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Result:</span>
          <Select value={filterResult} onValueChange={(v) => onResultChange(v as ResultFilter)}>
            <SelectTrigger className="w-[130px] bg-background/50 border-border/10 h-8 text-xs">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="incorrect">Incorrect only</SelectItem>
              <SelectItem value="correct">Correct only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
          >
            Clear filters
          </Button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <Checkbox
            id="select-all"
            checked={isAllSelected ? true : isAnySelected ? 'indeterminate' : false}
            onCheckedChange={onSelectAllToggle}
            className="border-muted-foreground/30 data-[state=checked]:bg-primary h-3.5 w-3.5"
          />
          <Label
            htmlFor="select-all"
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer whitespace-nowrap transition-colors"
          >
            Select All
          </Label>
        </div>
      </div>
    </div>
  );
}
