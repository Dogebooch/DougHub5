import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Lightbulb,
  Plus,
  Loader2,
  CheckCircle2,
  Trash2,
  Sparkles,
  XCircle,
} from "lucide-react";
import { CanonicalTopic } from "@/types";
import { cn } from "@/lib/utils";

interface TakeawaysModeProps {
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

interface Takeaway {
  id: string;
  text: string;
  generateCard: boolean;
}

/**
 * TakeawaysMode
 *
 * For images, audio, and lecture content.
 * User writes key takeaways, which become blocks.
 * Optionally generate cards from takeaways.
 */
export function TakeawaysMode({
  sourceItem,
  suggestedTopics,
  onComplete,
  onCancel,
}: TakeawaysModeProps) {
  const [selectedTopics, setSelectedTopics] = useState<CanonicalTopic[]>([]);
  const [availableTopics, setAvailableTopics] = useState<CanonicalTopic[]>([]);
  const [customTopic, setCustomTopic] = useState("");
  const [takeaways, setTakeaways] = useState<Takeaway[]>([
    { id: crypto.randomUUID(), text: "", generateCard: true },
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const result = await window.api.canonicalTopics.getAll();
        if (result.data) {
          setAvailableTopics(result.data);

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

  const addTakeaway = () => {
    setTakeaways((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: "", generateCard: true },
    ]);
  };

  const updateTakeaway = (id: string, updates: Partial<Takeaway>) => {
    setTakeaways((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const removeTakeaway = (id: string) => {
    if (takeaways.length <= 1) return;
    setTakeaways((prev) => prev.filter((t) => t.id !== id));
  };

  const validTakeaways = takeaways.filter((t) => t.text.trim().length > 0);

  const handleSave = async () => {
    if (selectedTopics.length === 0 || validTakeaways.length === 0) return;

    setIsSaving(true);
    setError(null);

    try {
      let blocksCreated = 0;
      let cardsCreated = 0;
      const timestamp = new Date().toISOString();

      for (const topic of selectedTopics) {
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

        // Create block for each takeaway
        for (let i = 0; i < validTakeaways.length; i++) {
          const takeaway = validTakeaways[i];
          const blockId = crypto.randomUUID();

          const blockResult = await window.api.notebookBlocks.create({
            id: blockId,
            notebookTopicPageId: pageId,
            sourceItemId: sourceItem.id,
            content: takeaway.text,
            userInsight: takeaway.text.slice(0, 500),
            position: i,
            cardCount: takeaway.generateCard ? 1 : 0,
            isHighYield: false,
            calloutType: 'pearl',
            intakeQuizResult: "skipped", // Self-reported, not quizzed
          });

          if (blockResult.data) {
            blocksCreated++;

            if (takeaway.generateCard) {
              const cardResult = await window.api.cards.create({
                id: crypto.randomUUID(),
                front: takeaway.text,
                back: "Self-captured takeaway",
                cardType: "cloze",
                notebookTopicPageId: pageId,
                sourceBlockId: blockId,
                activationStatus: "active",
                activationTier: "user_manual",
                activationReasons: ["User-created takeaway"],
                createdAt: timestamp,
                stability: 0,
                difficulty: 0,
                elapsedDays: 0,
                scheduledDays: 0,
                reps: 0,
                lapses: 0,
                state: 0,
                lastReview: null,
                dueDate: timestamp,
                tags: [topic.canonicalName, 'takeaway'],
                noteId: "",
                aiTitle: sourceItem.title,
                parentListId: null,
                listPosition: null,
              });

              if (cardResult.data) {
                cardsCreated++;
              }
            }
          }
        }
      }

      await window.api.sourceItems.update(sourceItem.id, {
        status: "curated",
        updatedAt: timestamp,
      });

      onComplete({
        selectedTopicIds: selectedTopics.map((t) => t.id),
        blocksCreated,
        cardsCreated,
      });
    } catch (err) {
      console.error("Failed to save takeaways:", err);
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header Summary */}
        <div className="flex items-center gap-3 p-4 bg-warning/5 rounded-lg border border-warning/10">
          <div className="p-2 rounded-full bg-warning/10">
            <Lightbulb className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Takeaways Mode</h3>
            <p className="text-xs text-muted-foreground">
              Directly capture what you learned from this media source.
            </p>
          </div>
        </div>

        {/* Source Preview */}
        <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
          <p className="text-sm font-medium mb-1 line-clamp-1">{sourceItem.title}</p>
          <Badge variant="outline" className="text-[10px] uppercase tracking-tighter">
            {sourceItem.sourceType}
          </Badge>
        </div>

        {/* Takeaways Input */}
        <div className="space-y-4">
          <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Key Learnings</Label>

          <div className="space-y-3">
            {takeaways.map((takeaway, index) => (
              <div key={takeaway.id} className="space-y-2 p-3 border rounded-lg bg-background/50 relative group">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-mono text-muted-foreground mt-2.5">
                    {index + 1}.
                  </span>
                  <Textarea
                    value={takeaway.text}
                    onChange={(e) =>
                      updateTakeaway(takeaway.id, { text: e.target.value })
                    }
                    placeholder="Capture a board-relevant pearl..."
                    className="min-h-[60px] flex-1 text-sm bg-transparent border-none focus-visible:ring-0 p-0 shadow-none resize-none"
                  />
                  {takeaways.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeTakeaway(takeaway.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                  <Checkbox
                    id={`card-${takeaway.id}`}
                    checked={takeaway.generateCard}
                    onCheckedChange={(checked) =>
                      updateTakeaway(takeaway.id, { generateCard: checked === true })
                    }
                    className="h-3 w-3"
                  />
                  <Label
                    htmlFor={`card-${takeaway.id}`}
                    className="text-[10px] text-muted-foreground cursor-pointer flex items-center gap-1"
                  >
                    Generate flashcard for this pearl
                  </Label>
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={addTakeaway}
            className="w-full h-8 text-xs border-dashed"
          >
            <Plus className="h-3 w-3 mr-2" />
            Add Another Takeaway
          </Button>
        </div>

        {/* Topic Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">File Under Topics</Label>
            <Badge variant="outline" className="text-[10px]">{selectedTopics.length} selected</Badge>
          </div>

          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 border rounded-lg bg-background/50">
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
          </div>

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
        </div>

        {error && <p className="text-xs text-destructive font-medium">{error}</p>}
      </div>

      {/* Actions */}
      <div className="p-6 border-t bg-muted/10 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          size="sm"
          disabled={
            selectedTopics.length === 0 || validTakeaways.length === 0 || isSaving
          }
          className="min-w-[140px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Capture {validTakeaways.length} Pearl{validTakeaways.length !== 1 ? "s" : ""}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
