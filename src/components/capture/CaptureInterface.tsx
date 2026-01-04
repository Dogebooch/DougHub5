import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/stores/useAppStore";
import { CardWithFSRS } from "@/types";

interface CardDraft {
  id: string;
  front: string;
  back: string;
}

export function CaptureInterface() {
  const { addCard } = useAppStore();
  const [drafts, setDrafts] = useState<CardDraft[]>([
    { id: crypto.randomUUID(), front: "", back: "" },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const hasValidCards = drafts.some(
    (d) => d.front.trim() !== "" && d.back.trim() !== ""
  );

  const addNewDraft = () => {
    setDrafts((prev) => [
      ...prev,
      { id: crypto.randomUUID(), front: "", back: "" },
    ]);
  };

  const removeDraft = (id: string) => {
    if (drafts.length === 1) return;
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  const updateDraft = (id: string, field: "front" | "back", value: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const handleCreateCards = async () => {
    const validDrafts = drafts.filter(
      (d) => d.front.trim() !== "" && d.back.trim() !== ""
    );

    if (validDrafts.length === 0) {
      toast.error("Please fill in at least one card");
      return;
    }

    setIsSaving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const draft of validDrafts) {
      const now = new Date();
      const cardWithFSRS: CardWithFSRS = {
        id: crypto.randomUUID(),
        front: draft.front.trim(),
        back: draft.back.trim(),
        noteId: "", // Orphan card (no parent note)
        tags: [],
        dueDate: now.toISOString(),
        createdAt: now.toISOString(),
        // FSRS defaults for new cards
        stability: 0,
        difficulty: 0,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: 0,
        lapses: 0,
        state: 0, // New
        lastReview: null,
      };

      const result = await addCard(cardWithFSRS);
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
        console.error(`Failed to create card: ${result.error}`);
      }
    }

    setIsSaving(false);

    if (successCount > 0) {
      toast.success(
        `Created ${successCount} card${successCount > 1 ? "s" : ""}!`
      );
      // Reset to single empty draft
      setDrafts([{ id: crypto.randomUUID(), front: "", back: "" }]);
    }

    if (errorCount > 0) {
      toast.error(
        `Failed to create ${errorCount} card${errorCount > 1 ? "s" : ""}`
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleCreateCards();
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-semibold text-foreground">
          Create Flashcards
        </h1>
        <p className="text-muted-foreground">
          Add question and answer pairs to build your study deck
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-4">
        {drafts.map((draft, index) => (
          <Card key={draft.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Card {index + 1}
                </CardTitle>
                {drafts.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeDraft(draft.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`front-${draft.id}`}>Question (Front)</Label>
                <Input
                  id={`front-${draft.id}`}
                  placeholder="What is the mechanism of action of aspirin?"
                  value={draft.front}
                  onChange={(e) =>
                    updateDraft(draft.id, "front", e.target.value)
                  }
                  onKeyDown={handleKeyDown}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`back-${draft.id}`}>Answer (Back)</Label>
                <Textarea
                  id={`back-${draft.id}`}
                  placeholder="Irreversible inhibition of cyclooxygenase (COX) enzymes..."
                  className="min-h-[100px] resize-none"
                  value={draft.back}
                  onChange={(e) =>
                    updateDraft(draft.id, "back", e.target.value)
                  }
                  onKeyDown={handleKeyDown}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={addNewDraft} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Another Card
          </Button>
          <Button
            onClick={handleCreateCards}
            disabled={!hasValidCards || isSaving}
            size="lg"
          >
            {isSaving ? "Creating..." : "Create Cards"}
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">⌘</kbd>{" "}
          + <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd>{" "}
          to create cards
        </p>
      </div>
    </div>
  );
}
