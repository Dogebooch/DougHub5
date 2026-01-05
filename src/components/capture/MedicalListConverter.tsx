/**
 * Medical List Converter Component
 * 
 * Preview component for medical list → overlapping cloze conversion.
 * Shows generated cards before creation, allows editing/removal.
 */

import { useState } from 'react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Edit2, Check, ListOrdered } from 'lucide-react';
import type { ProcessedListCard } from '@/lib/overlapping-cloze';
import type { MedicalListDetection } from '@/types/ai';

interface Props {
  listTitle: string;
  listType: MedicalListDetection['listType'];
  cards: ProcessedListCard[];
  onConfirm: (cards: ProcessedListCard[]) => void;
  onCancel: () => void;
}

export function MedicalListConverter({ 
  listTitle: initialTitle, 
  listType, 
  cards: initialCards, 
  onConfirm, 
  onCancel 
}: Props) {
  const [listTitle, setListTitle] = useState(initialTitle);
  const [cards, setCards] = useState(initialCards);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(initialCards.map((_, i) => i))
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [titleEditing, setTitleEditing] = useState(false);

  const toggleSelect = (index: number) => {
    const next = new Set(selectedIds);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedIds(next);
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(cards[index].back);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    
    // Update the back content
    setCards(prev => prev.map((card, i) =>
      i === editingIndex ? { ...card, back: editValue } : card
    ));
    setEditingIndex(null);
  };

  const handleConfirm = () => {
    const selected = cards.filter((_, i) => selectedIds.has(i));
    // Update list title in all selected cards
    const updated = selected.map(card => ({
      ...card,
      front: card.front.replace(/^[^:]+:/, `${listTitle}:`),
    }));
    onConfirm(updated);
  };

  const listTypeDisplay = {
    differential: 'Differential',
    procedure: 'Procedure',
    algorithm: 'Algorithm',
  }[listType || 'differential'];

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-3xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg">
        <CardHeader className="p-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {titleEditing ? (
                <div className="flex gap-2">
                  <Input
                    value={listTitle}
                    onChange={(e) => setListTitle(e.target.value)}
                    className="text-lg font-semibold"
                    autoFocus
                    onBlur={() => setTitleEditing(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setTitleEditing(false);
                      if (e.key === 'Escape') {
                        setListTitle(initialTitle);
                        setTitleEditing(false);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setTitleEditing(false)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">{listTitle}</CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setTitleEditing(true)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">
                  <ListOrdered className="h-3 w-3 mr-1" />
                  {listTypeDisplay}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {cards.length} items → {selectedIds.size} cards selected
                </span>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {cards.map((card, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    selectedIds.has(index) ? 'bg-accent/50 border-accent' : 'bg-muted/30 border-muted'
                  }`}
                >
                  <Checkbox
                    checked={selectedIds.has(index)}
                    onCheckedChange={() => toggleSelect(index)}
                  />
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {editingIndex === index ? (
                        <div className="flex gap-2 flex-1">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-8"
                            autoFocus
                            onBlur={saveEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') setEditingIndex(null);
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={saveEdit}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium flex-1">{card.back}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(index)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      {card.front.replace('{{c1::???}}', '[___]')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedIds.size === 0}
          >
            Create {selectedIds.size} Card{selectedIds.size !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}
