import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BookOpen,
  Plus,
  Loader2,
  CheckCircle2,
  Sparkles,
  XCircle,
} from "lucide-react";
import { CanonicalTopic } from "@/types";
import { cn } from "@/lib/utils";

interface ReferenceModeProps {
  sourceItem: {
    id: string;
    title: string;
    content: string;
    sourceType: string;
  };
  suggestedTopics: string[];
  onComplete: (result: {
    selectedTopicIds: string[];
    blocksCreated: number;
    cardsCreated: number;
  }) => void;
  onCancel: () => void;
}

/**
 * ReferenceMode
 *
 * Simplified intake for articles/PDFs/textbooks.
 * - Select topic(s) to file under
 * - Content added as reference block (no quiz, no auto-cards)
 * - User can generate cards later from the topic page
 */
export function ReferenceMode({
  sourceItem,
  suggestedTopics,
  onComplete,
  onCancel,
}: ReferenceModeProps) {
  const [selectedTopics, setSelectedTopics] = useState<CanonicalTopic[]>([]);
  const [availableTopics, setAvailableTopics] = useState<CanonicalTopic[]>([]);
  const [customTopic, setCustomTopic] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all available topics on mount to show in picker
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const result = await window.api.canonicalTopics.getAll();
        if (result.data) {
          setAvailableTopics(result.data);

          // Auto-select suggested topics
          if (suggestedTopics.length > 0) {
            const matched = result.data.filter(
              (t) =>
                suggestedTopics.some(
                  (s) =>
                    t.canonicalName.toLowerCase() === s.toLowerCase() ||
                    t.aliases.some((a) => a.toLowerCase() === s.toLowerCase())
                )
            );
            setSelectedTopics(matched);
          }
        }
      } catch (err) {
        console.error("Failed to fetch topics:", err);
        setError("Failed to load topics");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopics();
  }, [suggestedTopics]);

  const handleTopicToggle = (topic: CanonicalTopic) => {
    setSelectedTopics((prev) =>
      prev.some((t) => t.id === topic.id)
        ? prev.filter((t) => t.id !== topic.id)
        : [...prev, topic]
    );
  };

  const handleCreateTopic = async () => {
    if (!customTopic.trim()) return;

    try {
      const result = await window.api.canonicalTopics.createOrGet(customTopic.trim());

      if (result.data) {
        const newTopic = result.data;
        if (!availableTopics.some(t => t.id === newTopic.id)) {
          setAvailableTopics((prev) => [newTopic, ...prev]);
        }
        if (!selectedTopics.some(t => t.id === newTopic.id)) {
          setSelectedTopics((prev) => [...prev, newTopic]);
        }
        setCustomTopic("");
      }
    } catch (err) {
      console.error("Failed to create topic:", err);
    }
  };

  const handleSave = async () => {
    if (selectedTopics.length === 0) return;

    setIsSaving(true);
    setError(null);

    try {
      let blocksCreated = 0;
      const timestamp = new Date().toISOString();

      for (const topic of selectedTopics) {
        // Use the newly created window.api.notebookPages.getByTopic
        const pageResult = await window.api.notebookPages.getByTopic(topic.id);
        let pageId: string;

        if (pageResult.data) {
          pageId = pageResult.data.id;
        } else {
          const createResult = await window.api.notebookPages.create({
            id: crypto.randomUUID(),
            canonicalTopicId: topic.id,
            cardIds: [],
            createdAt: timestamp,
            updatedAt: timestamp,
          });
          if (createResult.error) throw new Error(createResult.error);
          pageId = createResult.data!.id;
        }

        // Create reference block (no cards)
        const blockResult = await window.api.notebookBlocks.create({
          id: crypto.randomUUID(),
          notebookTopicPageId: pageId,
          sourceItemId: sourceItem.id,
          content: `Reference: ${sourceItem.title}`,
          userInsight: sourceItem.content.slice(0, 1000), // Larger preview for reference
          position: 0,
          cardCount: 0,
          isHighYield: false,
          calloutType: 'pearl',
          intakeQuizResult: 'skipped', // Explicitly skipped for reference mode
        });

        if (blockResult.data) {
          blocksCreated++;
        }
      }

      // Update source item status to 'curated'
      await window.api.sourceItems.update(sourceItem.id, {
        status: "curated",
        updatedAt: timestamp,
      });

      onComplete({
        selectedTopicIds: selectedTopics.map((t) => t.id),
        blocksCreated,
        cardsCreated: 0,
      });
    } catch (err) {
      console.error("Failed to save reference:", err);
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Loading topics...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header Summary */}
        <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
          <div className="p-2 rounded-full bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Reference Mode</h3>
            <p className="text-xs text-muted-foreground">
              Filing this source for later review. No cards will be generated now.
            </p>
          </div>
        </div>

        {/* Source Preview */}
        <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
          <p className="text-sm font-medium mb-1 line-clamp-1">{sourceItem.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-2 italic">
            {sourceItem.content.slice(0, 200)}...
          </p>
        </div>

        {/* Topic Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Target Topics</Label>
            <Badge variant="outline" className="text-[10px]">{selectedTopics.length} selected</Badge>
          </div>

          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-3 border rounded-lg bg-background/50">
            {selectedTopics.map((topic) => (
              <Badge
                key={topic.id}
                variant="default"
                className="bg-primary/90 hover:bg-primary gap-1 py-1 px-2"
              >
                {topic.canonicalName}
                <XCircle 
                  className="h-3 w-3 cursor-pointer opacity-70 hover:opacity-100" 
                  onClick={() => handleTopicToggle(topic)}
                />
              </Badge>
            ))}
            
            {selectedTopics.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-1">
                Select topics below to file this reference.
              </p>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex gap-2">
              <Input
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="Search or add topic..."
                className="h-9 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateTopic();
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={handleCreateTopic}
                disabled={!customTopic.trim()}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {availableTopics
                .filter(t => !selectedTopics.some(s => s.id === t.id))
                .slice(0, 10)
                .map((topic) => (
                  <Badge
                    key={topic.id}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted transition-colors text-[11px] py-0.5 px-2"
                    onClick={() => handleTopicToggle(topic)}
                  >
                    {topic.canonicalName}
                  </Badge>
                ))}
            </div>
          </div>
        </div>

        {/* Info Note */}
        <div className="flex items-start gap-2 p-3 bg-info/10 rounded-lg text-xs border border-info/20">
          <Sparkles className="h-4 w-4 text-info mt-0.5 shrink-0" />
          <p className="text-info-foreground leading-relaxed">
            Reference items are saved to your Topic Page. You can highlight text or use AI to generate cards from the reference block later when you're ready to study.
          </p>
        </div>

        {error && (
          <p className="text-xs text-destructive font-medium">{error}</p>
        )}
      </div>

      {/* Actions */}
      <div className="p-6 border-t bg-muted/10 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          size="sm"
          disabled={selectedTopics.length === 0 || isSaving}
          className="min-w-[140px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Save Reference
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
