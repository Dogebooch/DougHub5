/**
 * PracticeBankCardList
 *
 * Displays Practice Bank flashcards for a Knowledge Entity.
 * Shows Golden Ticket (active) and Practice Bank (suspended) cards.
 * Allows activation/deactivation of banked cards.
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  Star,
  Sparkles,
  ChevronDown,
  Loader2,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Types matching backend DbPracticeBankFlashcard
interface PracticeBankCard {
  id: string;
  entityId: string;
  cardType: string;
  front: string;
  back: string;
  isGoldenTicket: boolean;
  isActive: boolean;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  state: number;
  dueDate: string | null;
  maturityState: "new" | "learning" | "graduated" | "retired";
  createdAt: string;
}

interface PracticeBankCardListProps {
  entityId: string;
  entityTitle: string;
  showFullCards?: boolean; // Show full card content vs compact view
  onCardActivationChange?: (cardId: string, isActive: boolean) => void;
}

const MATURITY_COLORS: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  learning: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  graduated: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  retired: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const CARD_TYPE_LABELS: Record<string, string> = {
  golden_ticket: "Core Concept",
  pathophysiology: "Pathophysiology",
  presentation: "Presentation",
  epidemiology: "Epidemiology",
  diagnosis: "Diagnosis",
  treatment: "Treatment",
  indications: "Indications",
  side_effects: "Side Effects",
  black_box: "Black Box Warning",
  contraindications: "Contraindications",
  morphology: "Morphology",
  virulence: "Virulence Factors",
  diseases: "Diseases Caused",
  differential: "Differential Dx",
  red_flags: "Red Flags",
  workup: "Initial Workup",
  image_occlusion: "Image Recognition",
  audio_recognition: "Audio Recognition",
  diagnostic_utility: "Diagnostic Utility",
  steps: "Procedure Steps",
  complications: "Complications",
  contents: "Contents",
  borders: "Borders",
  vascular_supply: "Vascular Supply",
  components: "Components",
  action: "Action Thresholds",
  application: "Clinical Application",
};

export const PracticeBankCardList: React.FC<PracticeBankCardListProps> = ({
  entityId,
  entityTitle,
  showFullCards = false,
  onCardActivationChange,
}) => {
  const [cards, setCards] = useState<PracticeBankCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Fetch cards on mount
  useEffect(() => {
    const fetchCards = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await window.api.practiceBank.getByEntityId(entityId);
        if (result?.success && result.data) {
          setCards(result.data);
        } else {
          setError(result?.error || "Failed to load cards");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [entityId]);

  // Toggle card active state
  const toggleCardActive = async (card: PracticeBankCard) => {
    try {
      if (card.isActive) {
        await window.api.practiceBank.deactivate(card.id);
      } else {
        await window.api.practiceBank.activate(card.id);
      }

      // Update local state
      setCards((prev) =>
        prev.map((c) =>
          c.id === card.id ? { ...c, isActive: !c.isActive } : c,
        ),
      );

      onCardActivationChange?.(card.id, !card.isActive);
    } catch (err) {
      console.error("Failed to toggle card:", err);
    }
  };

  // Toggle card expansion
  const toggleCardExpanded = (cardId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  // Separate Golden Ticket from Practice Bank cards
  const goldenTicket = cards.find((c) => c.isGoldenTicket);
  const practiceBankCards = cards.filter((c) => !c.isGoldenTicket);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading Practice Bank cards...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-destructive">
        <AlertCircle className="w-5 h-5 mr-2" />
        {error}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
        <Sparkles className="w-8 h-8 mb-2 text-warning/50" />
        <p className="text-sm">No Practice Bank cards generated yet.</p>
        <p className="text-xs mt-1">
          Cards are created when you set the Golden Ticket value.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-warning" />
          <h3 className="font-semibold">Practice Bank</h3>
          <Badge variant="outline" className="ml-2">
            {cards.length} cards
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="w-3 h-3 text-warning" />
            {goldenTicket ? "1" : "0"} Golden Ticket
          </span>
          <span>•</span>
          <span>
            {practiceBankCards.filter((c) => c.isActive).length}/
            {practiceBankCards.length} active
          </span>
        </div>
      </div>

      {/* Golden Ticket (always visible) */}
      {goldenTicket && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="w-4 h-4 text-warning fill-warning" />
                Golden Ticket
              </CardTitle>
              <Badge className={MATURITY_COLORS[goldenTicket.maturityState]}>
                {goldenTicket.maturityState}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="p-3 bg-background/50 rounded-md border border-border/50">
              <p className="text-sm font-medium">{goldenTicket.front}</p>
            </div>
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ChevronDown className="w-3 h-3" />
                Show answer
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-3 bg-muted/30 rounded-md border border-border/50">
                  <p className="text-sm whitespace-pre-wrap">
                    {goldenTicket.back}
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
            {goldenTicket.dueDate && (
              <p className="text-xs text-muted-foreground">
                Due: {new Date(goldenTicket.dueDate).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Practice Bank Cards */}
      {practiceBankCards.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Practice Bank Cards
          </h4>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {practiceBankCards.map((card) => (
                <Card
                  key={card.id}
                  className={`transition-all ${
                    card.isActive
                      ? "border-primary/30 bg-primary/5"
                      : "border-border/50 bg-muted/20 opacity-75"
                  }`}
                >
                  <CardHeader className="py-2 px-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">
                          {CARD_TYPE_LABELS[card.cardType] || card.cardType}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${MATURITY_COLORS[card.maturityState]}`}
                        >
                          {card.maturityState}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`active-${card.id}`}
                          className="text-xs text-muted-foreground"
                        >
                          {card.isActive ? "Active" : "Suspended"}
                        </Label>
                        <Switch
                          id={`active-${card.id}`}
                          checked={card.isActive}
                          onCheckedChange={() => toggleCardActive(card)}
                          disabled={card.maturityState === "retired"}
                        />
                      </div>
                    </div>
                  </CardHeader>

                  {showFullCards || expandedCards.has(card.id) ? (
                    <CardContent className="py-2 px-3 space-y-2">
                      <div className="p-2 bg-background/50 rounded border border-border/50">
                        <p className="text-xs">{card.front}</p>
                      </div>
                      <div className="p-2 bg-muted/30 rounded border border-border/50">
                        <p className="text-xs whitespace-pre-wrap">
                          {card.back}
                        </p>
                      </div>
                    </CardContent>
                  ) : (
                    <CardContent className="py-1 px-3">
                      <button
                        onClick={() => toggleCardExpanded(card.id)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <ChevronDown className="w-3 h-3" />
                        Show details
                      </button>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Stats Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted-foreground">
        <span>{entityTitle}</span>
        <span>
          {cards.filter((c) => c.reps > 0).length} reviewed •{" "}
          {cards.filter((c) => c.lapses > 0).length} with lapses
        </span>
      </div>
    </div>
  );
};

export default PracticeBankCardList;
