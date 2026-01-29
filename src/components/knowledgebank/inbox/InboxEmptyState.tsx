import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InboxEmptyStateProps {
  hasItems: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

/**
 * Empty state display when inbox has no items or no matching items.
 */
export function InboxEmptyState({
  hasItems,
  hasActiveFilters,
  onClearFilters,
}: InboxEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <div className="h-12 w-12 rounded-full bg-surface-elevated flex items-center justify-center">
        <Inbox className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="font-medium text-lg text-foreground">No items in inbox</h3>
        <p className="text-sm text-muted-foreground">
          {hasItems
            ? 'No items match your current search and filter criteria.'
            : 'Your inbox is empty. Start by capturing some medical content.'}
        </p>
      </div>
      {hasActiveFilters && (
        <Button variant="outline" size="sm" onClick={onClearFilters}>
          Clear all filters
        </Button>
      )}
    </div>
  );
}
