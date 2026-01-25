import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Plus, Loader2, BookOpen, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/useAppStore';
import { NeedsAttentionSection } from './NeedsAttentionSection';
import { RecentlyUpdatedSection } from './RecentlyUpdatedSection';
import { DomainGroupedTopics } from './DomainGroupedTopics';
import { TopicWithStats, LowEaseTopic, GlobalCardStats } from '@/types';
import { cn } from '@/lib/utils';

interface TopicBrowserProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onPageCreated: () => void;
}

export const TopicBrowser: React.FC<TopicBrowserProps> = ({
  selectedId,
  onSelect,
  onPageCreated
}) => {
  const [topics, setTopics] = useState<TopicWithStats[]>([]);
  const [lowEaseTopics, setLowEaseTopics] = useState<LowEaseTopic[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalCardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsResult, lowEaseResult, globalStatsResult] = await Promise.all([
        window.api.notebook.getTopicsWithStats(),
        window.api.cards.getLowEaseTopics(),
        window.api.cards.getGlobalStats()
      ]);

      if (statsResult.error) throw new Error(statsResult.error);
      if (lowEaseResult.error) throw new Error(lowEaseResult.error);
      if (globalStatsResult.error) throw new Error(globalStatsResult.error);

      setTopics(statsResult.data || []);
      setLowEaseTopics(lowEaseResult.data || []);
      setGlobalStats(globalStatsResult.data || null);
    } catch (err) {
      console.error('Failed to fetch topic browser data:', err);
      setError('Failed to load topics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Derived data
  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return topics;
    const query = searchQuery.toLowerCase();
    return topics.filter(t => 
      (t.title || '').toLowerCase().includes(query) || 
      (t.domain || '').toLowerCase().includes(query)
    );
  }, [topics, searchQuery]);

  const needsAttentionTopics = useMemo(() => {
    const lowEaseIds = new Set(lowEaseTopics.map(t => t.topicId));
    return filteredTopics.filter(t => {
      const isLowEase = t.canonicalTopicId && lowEaseIds.has(t.canonicalTopicId);
      // Accuracy criteria could go here if available
      return isLowEase;
    }).map(t => ({
      ...t,
      name: t.title || 'Untitled',
      isStrugglingTopic: true
    }));
  }, [filteredTopics, lowEaseTopics]);

  const recentlyUpdatedTopics = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return filteredTopics
      .filter(t => new Date(t.updatedAt) > sevenDaysAgo)
      .map(t => ({
        ...t,
        name: t.title || 'Untitled',
      }))
      .slice(0, 5); // Show top 5
  }, [filteredTopics]);

  const groupedTopics = useMemo(() => {
    return filteredTopics.map(t => ({
      ...t,
      name: t.title || 'Untitled',
    }));
  }, [filteredTopics]);

  const handleCreateTopic = async () => {
    // This logic usually involves a dialog or prompt
    // For now, we'll just call the parent callback
    onPageCreated();
  };

  if (isLoading && topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mb-2" />
        <span className="text-xs">Loading notebook...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-destructive text-center">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p className="text-sm font-medium">{error}</p>
        <Button 
          variant="link" 
          size="sm" 
          onClick={fetchData}
          className="mt-2"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-notebook-sidebar text-notebook-text">
      {/* Header */}
      <div className="p-4 border-b border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Notebook
          </h2>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 rounded-full hover:bg-white/10"
            onClick={handleCreateTopic}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        <div className="relative group">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search topics... (⌘K)"
            className="h-9 pl-9 bg-white/5 border-transparent focus-visible:ring-primary/50 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
        {!searchQuery && needsAttentionTopics.length > 0 && (
          <NeedsAttentionSection 
            topics={needsAttentionTopics}
            onSelectTopic={onSelect}
          />
        )}

        {!searchQuery && recentlyUpdatedTopics.length > 0 && (
          <RecentlyUpdatedSection 
            topics={recentlyUpdatedTopics}
            onSelectTopic={onSelect}
          />
        )}

        <DomainGroupedTopics 
          topics={groupedTopics}
          onSelectTopic={onSelect}
        />
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-white/5 bg-black/20">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          <div className="flex flex-col">
            <span>{topics.length} Topics</span>
            <span>{globalStats?.totalCards ?? 0} Cards</span>
          </div>
          <div className="text-right">
            <span className="text-primary font-bold block text-xs">
              {globalStats?.retention ?? 0}%
            </span>
            <span>Retention</span>
          </div>
        </div>
      </div>
    </div>
  );
};
