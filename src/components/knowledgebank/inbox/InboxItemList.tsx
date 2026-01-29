import { ScrollArea } from '@/components/ui/scroll-area';
import { SourceItemRow } from '../SourceItemRow';
import { SourceItem } from '@/types';
import { DateGroup } from '@/lib/source-item-utils';

interface InboxItemListProps {
  groupedItems: DateGroup[];
  selectedIds: Set<string>;
  extractingIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpen: (item: SourceItem) => void;
  onArchive: (item: SourceItem) => void;
  onDelete: (item: SourceItem) => void;
}

/**
 * Scrollable list of inbox items grouped by date.
 */
export function InboxItemList({
  groupedItems,
  selectedIds,
  extractingIds,
  onToggleSelect,
  onOpen,
  onArchive,
  onDelete,
}: InboxItemListProps) {
  return (
    <ScrollArea className="flex-1 min-w-0">
      <div className="p-4 pt-2 pb-24 min-w-0 w-full">
        <div className="rounded-lg border shadow-sm overflow-hidden bg-card min-w-0 w-full">
          {groupedItems.map((group, index) => (
            <section
              key={group.title}
              className={index > 0 ? 'border-t border-border/30' : ''}
            >
              <div className="flex items-center gap-3 px-4 py-2 bg-card-muted/10">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-card-muted">
                  {group.title}
                </h3>
                <div className="h-[1px] flex-1 bg-border/50" />
              </div>
              <div className="divide-y divide-border/30">
                {group.items.map((item) => (
                  <SourceItemRow
                    key={item.id}
                    sourceItem={item}
                    isSelected={selectedIds.has(item.id)}
                    isExtracting={extractingIds.has(item.id)}
                    onToggleSelect={() => onToggleSelect(item.id)}
                    onOpen={onOpen}
                    onArchive={onArchive}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}
