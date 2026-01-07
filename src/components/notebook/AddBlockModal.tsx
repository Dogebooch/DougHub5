import { useState, useEffect, useMemo } from 'react';
import { Plus, Loader2, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { SourceItem, NotebookBlock } from '@/types';

interface AddBlockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebookTopicPageId: string;
  onSuccess: () => void;
}

const SOURCE_TYPE_LABELS: Record<string, string> = {
  qbank: 'Q Bank',
  article: 'Article',
  pdf: 'PDF',
  image: 'Image',
  audio: 'Audio',
  quickcapture: 'Quick Capture',
  manual: 'Manual',
};

export function AddBlockModal({
  open,
  onOpenChange,
  notebookTopicPageId,
  onSuccess,
}: AddBlockModalProps) {
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Fetch sources when modal opens
  useEffect(() => {
    let cancelled = false;

    const fetchSources = async () => {
      if (!open) return;

      setLoading(true);
      try {
        const result = await window.api.sourceItems.getAll();
        
        if (cancelled) return;

        if (result.error) {
          console.error('Failed to fetch sources:', result.error);
          toast({
            title: 'Error',
            description: 'Failed to load sources from Knowledge Bank',
            variant: 'destructive',
          });
          setSources([]);
          return;
        }

        // Filter to only processed/curated items (exclude inbox)
        const eligible = (result.data || []).filter(
          (item) => item.status === 'processed' || item.status === 'curated'
        );
        setSources(eligible);
      } catch (error) {
        if (cancelled) return;
        console.error('Error fetching sources:', error);
        toast({
          title: 'Error',
          description: 'An unexpected error occurred',
          variant: 'destructive',
        });
        setSources([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchSources();

    return () => {
      cancelled = true;
    };
  }, [open, toast]);

  // Reset search when modal closes
  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  // Filter sources by search term (useMemo for performance)
  const filteredSources = useMemo(() => {
    if (!search.trim()) return sources;
    
    const searchLower = search.toLowerCase();
    return sources.filter((source) =>
      source.title.toLowerCase().includes(searchLower)
    );
  }, [sources, search]);

  const handleSelectSource = async (source: SourceItem) => {
    setIsSubmitting(true);

    try {
      // 1. Fetch existing blocks to determine next position
      const blocksResult = await window.api.notebookBlocks.getByPage(notebookTopicPageId);
      
      if (blocksResult.error) {
        throw new Error(blocksResult.error);
      }

      const existingBlocks = blocksResult.data || [];
      const maxPosition = existingBlocks.length > 0
        ? Math.max(...existingBlocks.map((b) => b.position))
        : 0;

      // 2. Create new block
      const newBlock: Omit<NotebookBlock, 'cardCount'> = {
        id: crypto.randomUUID(),
        notebookTopicPageId,
        sourceItemId: source.id,
        content: source.rawContent,
        annotations: null,
        mediaPath: source.mediaPath || null,
        position: maxPosition + 1,
      };

      const createResult = await window.api.notebookBlocks.create(newBlock);
      
      if (createResult.error) {
        throw new Error(createResult.error);
      }

      // 3. Update source status to 'curated'
      // Note: Log warning if this fails but don't block success flow
      const updateResult = await window.api.sourceItems.update(source.id, {
        status: 'curated',
      });

      if (updateResult.error) {
        console.warn(
          `Block created successfully but failed to update source status: ${updateResult.error}`
        );
      }

      // 4. Success feedback
      toast({
        title: 'Block Added',
        description: `"${source.title}" added to notebook`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating block:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add block',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add from Knowledge Bank</DialogTitle>
          <DialogDescription>
            Select a processed source to add as a content block
          </DialogDescription>
        </DialogHeader>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            disabled={loading || isSubmitting}
          />
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <p className="text-sm">Loading sources...</p>
            </div>
          ) : sources.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-muted-foreground">No processed sources available</p>
              <p className="text-xs text-muted-foreground">
                Process items from Inbox or Capture new content first
              </p>
            </div>
          ) : filteredSources.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <p className="text-muted-foreground">No sources match "{search}"</p>
              <p className="text-xs text-muted-foreground">
                Try a different search term
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => handleSelectSource(source)}
                  disabled={isSubmitting}
                  className="w-full text-left p-3 rounded-lg border bg-card hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="font-medium text-sm line-clamp-1">
                      {source.title}
                    </h4>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {SOURCE_TYPE_LABELS[source.sourceType] || source.sourceType}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {source.rawContent.substring(0, 100)}
                    {source.rawContent.length > 100 ? '...' : ''}
                  </p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
