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
      case "processed":
        return { variant: "secondary" as const, className: "" };
      case "curated":
        return {
          variant: "outline" as const,
          className: "text-success border-success",
        };
      case "inbox":
      default:
        return { variant: "default" as const, className: "" };
    }
  };

  const badgeConfig = getBadgeConfig();

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={onToggle}
      className="w-full border-b border-black/5"
    >
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-3 hover:bg-black/5 cursor-pointer transition-colors group text-card-foreground">
          <div className="flex items-center gap-2">
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform duration-200 text-card-muted",
                isExpanded && "rotate-90"
              )}
            />
            <span className="font-semibold text-[11px] uppercase tracking-wider">
              {title}
            </span>
          </div>
          <Badge
            variant={badgeConfig.variant}
            className={cn(
              "px-2 py-0.5 text-[11px] font-bold",
              badgeConfig.className
            )}
          >
            {count}
          </Badge>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col bg-card divide-y divide-border/30">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
