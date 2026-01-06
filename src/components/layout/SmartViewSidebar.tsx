// src/components/layout/SmartViewSidebar.tsx

import { useAppStore } from '@/stores/useAppStore';
import { AppView } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface SmartViewItem {
  id: string;
  name: string;
  icon: string;
  viewKey: string; // maps to currentView in store
}

const SYSTEM_VIEWS: SmartViewItem[] = [
  { id: 'inbox', name: 'Inbox', icon: '📥', viewKey: 'inbox' },
  { id: 'today', name: 'Today', icon: '📅', viewKey: 'today' },
  { id: 'queue', name: 'Queue', icon: '📋', viewKey: 'queue' },
  { id: 'notebook', name: 'Notebook', icon: '📚', viewKey: 'notebook' },
  { id: 'weak', name: 'Weak Topics', icon: '⚠️', viewKey: 'weak' },
];

export function SmartViewSidebar() {
  const currentView = useAppStore(state => state.currentView);
  const setCurrentView = useAppStore(state => state.setCurrentView);
  const smartViewCounts = useAppStore((state) => state.smartViewCounts);

  return (
    <div className="flex flex-col gap-1 w-full px-2">
      <div className="px-3 mb-2">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
          Smart Views
        </h3>
      </div>
      
      <div className="space-y-1">
        {SYSTEM_VIEWS.map((view) => {
          const isActive = currentView === view.viewKey;
          
          return (
            <button
              key={view.id}
              onClick={() => {
                setCurrentView(view.viewKey as AppView);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150",
                "hover:bg-accent/50 group",
                isActive 
                  ? "bg-accent text-accent-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="text-base flex-shrink-0 grayscale group-hover:grayscale-0 transition-all duration-150">
                {view.icon}
              </span>
              
              <span className="flex-1 text-left">
                {view.name}
              </span>
              
              <Badge 
                variant="secondary" 
                className={cn(
                  "h-5 min-w-[20px] px-1.5 text-[10px] font-bold transition-colors",
                  isActive ? "bg-background/20 text-accent-foreground" : "bg-muted text-muted-foreground opacity-50"
                )}
              >
                {smartViewCounts[view.viewKey] || 0}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
}
