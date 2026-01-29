import { Inbox } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface InboxHeaderProps {
  totalCount: number;
}

/**
 * Inbox page header with title and total item count badge.
 */
export function InboxHeader({ totalCount }: InboxHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/10 flex items-center justify-center">
          <Inbox className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold mt-0.5">
            Initial Capture Queue
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="bg-primary/5 text-primary border-primary/20 font-bold px-3 py-1 text-[11px]"
        >
          {totalCount} TOTAL
        </Badge>
      </div>
    </div>
  );
}
