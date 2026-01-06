import { useState, useEffect, useCallback } from "react";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAppStore } from "@/stores/useAppStore";
import { useToast } from "@/hooks/use-toast";
import { CanonicalTopic } from "@/types";

interface AddToNotebookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemIds: string[];
  onSuccess: () => void;
}

export function AddToNotebookDialog({
  open,
  onOpenChange,
  itemIds,
  onSuccess,
}: AddToNotebookDialogProps) {
  const [inputValue, setInputValue] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<CanonicalTopic | null>(null);
  const [suggestions, setSuggestions] = useState<CanonicalTopic[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const batchAddToNotebook = useAppStore((state) => state.batchAddToNotebook);
  const { toast } = useToast();

  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const result = await window.api.canonicalTopics.suggestMatches(input);
      if (result.data) {
        setSuggestions(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch topic suggestions:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue && !selectedTopic) {
        fetchSuggestions(inputValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, selectedTopic, fetchSuggestions]);

  const handleConfirm = async () => {
    let topicId = selectedTopic?.id;
    setIsSubmitting(true);

    try {
      // If no topic selected but we have input, create/get topic first
      if (!topicId && inputValue.trim()) {
        const result = await window.api.canonicalTopics.createOrGet(inputValue.trim());
        if (result.data) {
          topicId = result.data.id;
        } else {
          throw new Error(result.error || "Failed to create topic");
        }
      }

      if (!topicId) return;

      const result = await batchAddToNotebook(itemIds, topicId);
      if (result.success) {
        toast({
          title: "Added to Notebook",
          description: `Successfully moved ${itemIds.length} item(s) to topic "${
            selectedTopic?.canonicalName || inputValue.trim()
          }".`,
        });
        onSuccess();
        onOpenChange(false);
        // Reset state
        setInputValue("");
        setSelectedTopic(null);
      } else {
        toast({
          title: "Execution Error",
          description: result.error || "Failed to move items.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && selectedTopic && !isSubmitting) {
      e.preventDefault();
      handleConfirm();
    }
  };

  const exactMatch = suggestions.find(
    (s) => s.canonicalName.toLowerCase() === inputValue.toLowerCase()
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add to Notebook</DialogTitle>
          <DialogDescription>
            Select or create a topic for {itemIds.length} item(s).
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={popoverOpen}
                className="w-full justify-between"
              >
                {selectedTopic
                  ? selectedTopic.canonicalName
                  : inputValue || "Select topic..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Search topics..."
                  value={inputValue}
                  onValueChange={(val) => {
                    setInputValue(val);
                    if (selectedTopic) setSelectedTopic(null);
                  }}
                  onKeyDown={handleKeyDown}
                />
                <CommandList>
                  {isSearching && (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">
                        Searching...
                      </span>
                    </div>
                  )}
                  {!isSearching && suggestions.length > 0 && (
                    <CommandGroup heading="Suggestions">
                      {suggestions.map((topic) => (
                        <CommandItem
                          key={topic.id}
                          value={topic.id}
                          onSelect={() => {
                            setSelectedTopic(topic);
                            setInputValue(topic.canonicalName);
                            setPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedTopic?.id === topic.id
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{topic.canonicalName}</span>
                            {topic.aliases.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                Aliases: {topic.aliases.join(", ")}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {!isSearching && inputValue.length >= 2 && !exactMatch && (
                    <CommandGroup heading="New Topic">
                      <CommandItem
                        value="create-new"
                        onSelect={() => {
                          setPopoverOpen(false);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        <span>Create new topic: "{inputValue}"</span>
                      </CommandItem>
                    </CommandGroup>
                  )}
                  {!isSearching && inputValue.length > 0 && inputValue.length < 2 && (
                    <div className="p-4 text-sm text-muted-foreground">
                      Type at least 2 characters...
                    </div>
                  )}
                  {!isSearching && inputValue.length >= 2 && suggestions.length === 0 && !exactMatch && (
                     <CommandEmpty>No existing topics found.</CommandEmpty>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={(!selectedTopic && !inputValue.trim()) || isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
