import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusGroupProps {
  title: string;
  count: number;
  status: 'inbox' | 'processed' | 'curated';
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/**
 * StatusGroup is a collapsible section component used in the Knowledge Bank 
 * to group SourceItems by their current status (inbox, processed, curated).
 * It is a pure presentational component controlled by its parent.
 */
export const StatusGroup = ({
  title,
  count,
  status,
  isExpanded,
  onToggle,
  children,
}: StatusGroupProps) => {
  // Determine badge styling based on status
  // Inbox uses primary (teal), Processed uses secondary (gray), Curated uses green outline
  const getBadgeConfig = () => {
    switch (status) {
      case 'processed':
        return { variant: 'secondary' as const, className: '' };
      case 'curated':
        return { 
          variant: 'outline' as const, 
          className: 'text-green-600 border-green-600 dark:text-green-400 dark:border-green-400' 
        };
      case 'inbox':
      default:
        return { variant: 'default' as const, className: '' };
    }
  };

  const badgeConfig = getBadgeConfig();

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={onToggle}
      className="w-full border-b"
    >
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer transition-colors group">
          <div className="flex items-center gap-2">
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform duration-200 text-muted-foreground",
                isExpanded && "rotate-90"
              )}
            />
            <span className="font-medium text-sm capitalize">{title}</span>
          </div>
          <Badge 
            variant={badgeConfig.variant} 
            className={cn("px-2 py-0.5 text-xs font-semibold", badgeConfig.className)}
          >
            {count}
          </Badge>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
