import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { List, ListImperativeAPI } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import {
  Search,
  SortDesc,
  Calendar,
  AlertTriangle,
  Layers,
  Trophy,
  Zap,
  CheckCircle2,
  Clock,
  ChevronRight,
  Pencil,
  Pause,
  Play,
  Trash2,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAppStore } from '@/stores/useAppStore';
import { useToast } from '@/hooks/use-toast';
import type { CardBrowserItem } from '@/types';
import { cn } from '@/lib/utils';
import { CardEditModal } from './CardEditModal';

import { LucideIcon } from 'lucide-react';

// Helper to handle virtual scrolling naming and AutoSizer's tricky typing
const AutoSizerComponent = AutoSizer as unknown as React.ComponentType<{
  children: (props: { height: number; width: number }) => React.ReactNode;
}>;

// Custom props passed via rowProps (exclude index, style, ariaAttributes - added by react-window)
interface CardRowData {
  cards: CardBrowserItem[];
  expandedCardId: string | null;
  onToggleExpand: (cardId: string) => void;
  onEdit: (card: CardBrowserItem) => void;
  onSuspend: (card: CardBrowserItem) => void;
  onDelete: (card: CardBrowserItem) => void;
  suspendingCardId: string | null;
}

// Full props received by CardRow component
interface CardRowProps extends CardRowData {
  index: number;
  style: React.CSSProperties;
  ariaAttributes: {
    "aria-posinset": number;
    "aria-setsize": number;
    role: "listitem";
  };
}

function CardRow({ index, style, cards, expandedCardId, onToggleExpand, onEdit, onSuspend, onDelete, suspendingCardId }: CardRowProps) {
  const setCurrentView = useAppStore(state => state.setCurrentView);

  const card = cards[index];
  const isExpanded = card.id === expandedCardId;
  const isSuspending = suspendingCardId === card.id;
  // Suspended cards have state = 4 (FSRS convention)
  const isSuspended = card.state === 4;

  // Status badge color mapping
  const statusConfig: Record<number, { label: string; className: string; icon: LucideIcon }> = {
    0: { label: 'New', className: 'bg-info/10 text-info border-info/20', icon: Zap },
    1: { label: 'Learning', className: 'bg-warning/10 text-warning border-warning/20', icon: Clock },
    2: { label: 'Review', className: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
    3: { label: 'Relearning', className: 'bg-destructive/10 text-destructive border-destructive/20', icon: AlertTriangle },
    4: { label: 'Suspended', className: 'bg-muted/50 text-muted-foreground border-muted', icon: Pause },
  };

  const status = statusConfig[card.state] || statusConfig[0];
  const StatusIcon = status.icon;

  // Truncate front text to 60 chars for collapsed view
  const truncatedFront = card.front.length > 60
    ? card.front.substring(0, 60) + '...'
    : card.front;

  const handleClick = () => {
    onToggleExpand(card.id);
  };

  const handleTopicClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row toggle
    if (card.notebookTopicPageId) {
      setCurrentView('notebook', card.notebookTopicPageId);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(card);
  };

  const handleSuspendClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSuspend(card);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(card);
  };

  return (
    <div 
      style={style}
      onClick={handleClick}
      className={cn(
        "flex flex-col border-b border-border transition-colors cursor-pointer group",
        isExpanded 
          ? "bg-muted/30 border-l-2 border-l-primary" 
          : "hover:bg-muted/50"
      )}
    >
      {/* Collapsed view - always visible */}
      <div className="flex items-center gap-3 px-4 h-[59px]">
        {/* Expand indicator */}
        <ChevronRight className={cn(
          "h-4 w-4 text-muted-foreground transition-transform flex-shrink-0",
          isExpanded && "rotate-90 text-primary"
        )} />

        <div className="flex-1 min-w-0 py-2">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-medium truncate transition-colors",
              isExpanded ? "text-primary" : "text-foreground group-hover:text-primary"
            )}>
              {truncatedFront}
            </span>
            {card.isLeech && !isExpanded && (
              <Badge variant="outline" className="bg-warning text-warning-foreground border-warning h-5 px-1.5 text-[10px] uppercase tracking-tighter">
                Leech
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3 mt-1">
            {card.topicName && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate max-w-[150px]">
                <Layers className="w-3 h-3 shrink-0" />
                <span className="truncate">{card.topicName}</span>
              </div>
            )}
            
            {card.dueDate && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Calendar className="w-3 h-3 shrink-0" />
                <span>{new Date(card.dueDate).toLocaleDateString()}</span>
              </div>
            )}

            {card.siblingCount > 1 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-muted/50">
                {card.siblingCount} siblings
              </Badge>
            )}
          </div>
        </div>

        {/* Hover action buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mr-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={handleEditClick}
            title="Edit card"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7",
              isSuspended
                ? "text-success hover:text-success"
                : "text-muted-foreground hover:text-warning"
            )}
            onClick={handleSuspendClick}
            disabled={isSuspending}
            title={isSuspended ? "Unsuspend card" : "Suspend card"}
          >
            {isSuspending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isSuspended ? (
              <Play className="h-3.5 w-3.5" />
            ) : (
              <Pause className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={handleDeleteClick}
            title="Delete card"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Badge
          variant="outline"
          className={cn("text-[10px] px-2 py-0 h-6 gap-1 shrink-0 font-semibold uppercase tracking-wider", status.className)}
        >
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </Badge>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-11 pb-4 space-y-4 animate-collapsible-down overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Front</Label>
              <p className="text-sm font-medium text-foreground leading-relaxed break-words whitespace-pre-wrap">
                {card.front}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Back</Label>
              <div className="text-sm text-foreground/80 leading-relaxed max-h-[150px] overflow-y-auto scrollbar-thin pr-2 break-words whitespace-pre-wrap">
                {card.back}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/50">
            {card.tags && card.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {card.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-2 font-normal">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 text-[11px] text-muted-foreground ml-auto">
              {card.topicName && (
                <button 
                  onClick={handleTopicClick}
                  className="flex items-center gap-1 hover:text-primary transition-colors hover:underline underline-offset-4"
                  aria-label="Jump to notebook topic page"
                >
                  <Layers className="w-3 h-3" />
                  {card.topicName}
                </button>
              )}
              {card.sourceBlockId && (
                <div className="flex items-center gap-1 opacity-60">
                  <span className="text-[10px]">ID:</span>
                  <code className="bg-muted px-1 rounded text-[9px] font-mono">
                    {card.sourceBlockId.slice(0, 8)}
                  </code>
                </div>
              )}
            </div>
          </div>

          {card.isLeech && (
            <div className="flex items-start gap-2 p-2 rounded bg-warning/5 border border-warning/20 text-warning-foreground text-[11px]">
              <AlertTriangle className="w-4 h-4 shrink-0 text-warning" />
              <p>
                <strong>Leech Warning:</strong> This card has been missed many times. 
                Consider rewriting it or splitting it into simpler concepts in the notebook.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CardBrowserView() {
  const [cards, setCards] = useState<CardBrowserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'due' | 'leeches' | 'all'>('all');
  const [sortField, setSortField] = useState<'dueDate' | 'createdAt' | 'difficulty' | 'lastReview'>('dueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Expand state and list ref
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const listRef = useRef<ListImperativeAPI>(null);

  // Action modal/dialog state
  const [editingCard, setEditingCard] = useState<CardBrowserItem | null>(null);
  const [deletingCard, setDeletingCard] = useState<CardBrowserItem | null>(null);
  const [suspendingCardId, setSuspendingCardId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getBrowserList = useAppStore(state => state.getBrowserList);
  const { toast } = useToast();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchCards = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: { leechesOnly?: boolean; search?: string } = {};

      if (activeTab === 'leeches') {
        filters.leechesOnly = true;
      }
      if (debouncedSearch.trim()) {
        filters.search = debouncedSearch.trim();
      }

      const result = await getBrowserList(filters, { field: sortField, direction: sortDirection });
      setCards(result || []);
    } catch (error) {
      console.error('Failed to fetch cards:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getBrowserList, activeTab, debouncedSearch, sortField, sortDirection]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const filteredCards = useMemo(() => {
    if (activeTab === 'due') {
      const today = new Date().toISOString().split('T')[0];
      return cards.filter(card => card.dueDate && card.dueDate <= today);
    }
    return cards;
  }, [cards, activeTab]);

  // Height calculator for VariableSizeList
  const getItemSize = useCallback((index: number) => {
    const card = filteredCards[index];
    if (card && card.id === expandedCardId) {
      return 240; // Expanded height (approximate, adjust based on content)
    }
    return 60; // Collapsed height
  }, [filteredCards, expandedCardId]);

  const handleToggleExpand = useCallback((cardId: string) => {
    setExpandedCardId(prev => prev === cardId ? null : cardId);
  }, []);

  // Action handlers
  const handleEdit = useCallback((card: CardBrowserItem) => {
    setEditingCard(card);
  }, []);

  const handleSuspend = useCallback(async (card: CardBrowserItem) => {
    setSuspendingCardId(card.id);
    const isSuspended = card.state === 4;
    // Toggle between suspended (4) and the card's previous state
    // For simplicity, unsuspending goes back to Review state (2)
    const newState = isSuspended ? 2 : 4;

    try {
      const result = await window.api.cards.update(card.id, { state: newState });
      if (result.error) {
        toast({
          title: 'Failed to update card',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: isSuspended ? 'Card unsuspended' : 'Card suspended',
          description: isSuspended
            ? 'The card will appear in your reviews again.'
            : 'The card has been removed from reviews.',
        });
        // Refresh the list
        fetchCards();
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setSuspendingCardId(null);
    }
  }, [fetchCards, toast]);

  const handleDelete = useCallback((card: CardBrowserItem) => {
    setDeletingCard(card);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingCard) return;

    setIsDeleting(true);
    try {
      const result = await window.api.cards.remove(deletingCard.id);
      if (result.error) {
        toast({
          title: 'Failed to delete card',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Card deleted',
          description: 'The card has been permanently removed.',
        });
        // Clear expanded if we deleted the expanded card
        if (expandedCardId === deletingCard.id) {
          setExpandedCardId(null);
        }
        fetchCards();
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeletingCard(null);
    }
  }, [deletingCard, expandedCardId, fetchCards, toast]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in search input
      if (document.activeElement?.tagName === 'INPUT') return;
      if (!filteredCards.length) return;

      const currentIndex = expandedCardId
        ? filteredCards.findIndex(c => c.id === expandedCardId)
        : -1;

      switch (e.key) {
        case 'ArrowRight': {
          // Expand first or focused
          if (currentIndex === -1 && filteredCards[0]) {
            setExpandedCardId(filteredCards[0].id);
            listRef.current?.scrollToRow({ index: 0, align: 'smart' });
          }
          break;
        }

        case 'ArrowLeft': {
          // Collapse current
          setExpandedCardId(null);
          break;
        }

        case 'ArrowDown': {
          e.preventDefault();
          const nextIndex = Math.min(currentIndex + 1, filteredCards.length - 1);
          if (nextIndex >= 0) {
            setExpandedCardId(filteredCards[nextIndex].id);
            listRef.current?.scrollToRow({ index: nextIndex, align: 'smart' });
          }
          break;
        }

        case 'ArrowUp': {
          e.preventDefault();
          const prevIndex = Math.max(currentIndex - 1, 0);
          if (currentIndex !== 0) { // Don't reset if already at top
            setExpandedCardId(filteredCards[prevIndex].id);
            listRef.current?.scrollToRow({ index: prevIndex, align: 'smart' });
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredCards, expandedCardId]);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header Toolbar */}
      <div className="p-4 space-y-4 border-b bg-surface-base">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-surface-elevated border-border ring-offset-background"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select 
              value={`${sortField}-${sortDirection}`} 
              onValueChange={(val) => {
                const parts = val.split('-');
                const field = parts[0] as 'dueDate' | 'createdAt' | 'difficulty' | 'lastReview';
                const dir = parts[1] as 'asc' | 'desc';
                setSortField(field);
                setSortDirection(dir);
              }}
            >
              <SelectTrigger className="w-[180px] h-9 bg-surface-elevated border-border">
                <SortDesc className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dueDate-asc">Due Date (Earlier First)</SelectItem>
                <SelectItem value="dueDate-desc">Due Date (Later First)</SelectItem>
                <SelectItem value="createdAt-desc">Created (Newest First)</SelectItem>
                <SelectItem value="createdAt-asc">Created (Oldest First)</SelectItem>
                <SelectItem value="difficulty-desc">Difficulty (Hardest First)</SelectItem>
                <SelectItem value="difficulty-asc">Difficulty (Easiest First)</SelectItem>
                <SelectItem value="lastReview-desc">Last Reviewed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs 
          value={activeTab} 
          onValueChange={(v) => setActiveTab(v as 'due' | 'leeches' | 'all')} 
          className="w-full"
        >
          <TabsList className="bg-surface-elevated border-border h-9">
            <TabsTrigger value="all" className="text-xs">All Cards</TabsTrigger>
            <TabsTrigger value="due" className="text-xs">
              Due
              {activeTab !== 'due' && cards.some(c => c.dueDate && c.dueDate <= new Date().toISOString().split('T')[0]) && (
                <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </TabsTrigger>
            <TabsTrigger value="leeches" className="text-xs">Leeches</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main List Area */}
      <div className="flex-1 relative min-h-0 bg-background/50">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            <p className="text-sm animate-pulse-subtle">Analyzing board cards...</p>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            {activeTab === 'leeches' ? (
              <div className="space-y-4 max-w-xs">
                <div className="mx-auto w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-success" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Zero Leeches Found</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your retention is excellent! No cards are currently struggling.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-xs">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                  <Search className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">No cards matching your criteria</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {debouncedSearch ? 'Try a more general search term or clear filters.' : 'Start capturing medical concepts from your Notebook to generate cards.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <AutoSizerComponent>
            {({ height, width }: { height: number; width: number }) => (
              <List<CardRowData>
                listRef={listRef}
                style={{ height: height || 600, width: width || 800 }}
                rowCount={filteredCards.length}
                rowHeight={(idx) => getItemSize(idx)}
                rowComponent={CardRow}
                rowProps={{
                  cards: filteredCards,
                  expandedCardId,
                  onToggleExpand: handleToggleExpand,
                  onEdit: handleEdit,
                  onSuspend: handleSuspend,
                  onDelete: handleDelete,
                  suspendingCardId
                }}
                className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
              />
            )}
          </AutoSizerComponent>
        )}
      </div>

      {/* Footer statistics */}
      <div className="px-4 py-2 border-t bg-surface-base flex justify-between items-center text-[10px] text-muted-foreground uppercase tracking-wider">
        <div className="flex gap-4">
          <span>Total: {cards.length}</span>
          <span>Filtered: {filteredCards.length}</span>
        </div>
        {activeTab === 'due' && (
          <span className="flex items-center gap-1 text-primary font-bold">
            <Zap className="w-3 h-3" />
            Priority Focus
          </span>
        )}
      </div>

      {/* Edit Modal */}
      {editingCard && (
        <CardEditModal
          open={!!editingCard}
          onOpenChange={(open) => !open && setEditingCard(null)}
          cardId={editingCard.id}
          initialFront={editingCard.front}
          initialBack={editingCard.back}
          initialTags={editingCard.tags || []}
          onSave={fetchCards}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCard} onOpenChange={(open) => !open && setDeletingCard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this card?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The card will be permanently removed from your collection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deletingCard && (
            <div className="my-2 p-3 rounded bg-muted/50 border text-sm">
              <span className="text-muted-foreground text-[10px] uppercase tracking-wider block mb-1">Front</span>
              <p className="line-clamp-2">{deletingCard.front}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
