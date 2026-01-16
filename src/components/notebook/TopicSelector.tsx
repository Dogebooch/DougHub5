import { useState, useEffect, useCallback } from "react";
import { Check, ChevronsUpDown, Loader2, Plus, AlertCircle } from "lucide-react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { CanonicalTopic } from "@/types";

interface TopicSelectorProps {
  selectedTopic: CanonicalTopic | null;
  onTopicSelect: (topic: CanonicalTopic | null) => void;
  /** Optional: pre-populate with a suggested topic name (e.g., from source metadata) */
  suggestedTopicName?: string;
  className?: string;
}

export function TopicSelector({
  selectedTopic,
  onTopicSelect,
  suggestedTopicName,
  className,
}: TopicSelectorProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(suggestedTopicName || "");
  const [suggestions, setSuggestions] = useState<CanonicalTopic[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync input value with selected topic when it changes externally
  useEffect(() => {
    if (selectedTopic) {
      setInputValue(selectedTopic.canonicalName);
    } else if (!open && !inputValue && suggestedTopicName) {
      // Re-populate suggestion if nothing selected and dropdown is closed
      setInputValue(suggestedTopicName);
    }
  }, [selectedTopic, open, suggestedTopicName]);

  // Debounced search for topic suggestions
  const fetchSuggestions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    setError(null);
    try {
      const result = await window.api.canonicalTopics.suggestMatches(input);
      if (result.data) {
        setSuggestions(result.data);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error("Failed to fetch topic suggestions:", err);
      setError("Failed to search topics");
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only search if we don't have a selected topic that matches the input exactly
      if (inputValue && (!selectedTopic || selectedTopic.canonicalName !== inputValue)) {
        fetchSuggestions(inputValue);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue, selectedTopic, fetchSuggestions]);

  // Handle selecting an existing topic
  const handleSelectTopic = (topic: CanonicalTopic) => {
    onTopicSelect(topic);
    setInputValue(topic.canonicalName);
    setOpen(false);
    setError(null);
  };

  // Handle creating a new topic
  const handleCreateTopic = async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isCreating) return;
    
    setIsCreating(true);
    setError(null);
    try {
      const result = await window.api.canonicalTopics.createOrGet(trimmedInput);
      if (result.data) {
        onTopicSelect(result.data);
        setInputValue(result.data.canonicalName);
        setOpen(false);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error("Failed to create topic:", err);
      setError("Failed to create topic");
    } finally {
      setIsCreating(false);
    }
  };

  // Check if input exactly matches an existing topic (canonical or alias)
  const exactMatch = suggestions.find(
    (s) => 
      s.canonicalName.toLowerCase() === inputValue.toLowerCase() ||
      s.aliases.some(a => a.toLowerCase() === inputValue.toLowerCase())
  );

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="topic-selector" className="text-sm font-medium">Topic</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="topic-selector"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {selectedTopic ? (
              <span className="truncate">{selectedTopic.canonicalName}</span>
            ) : (
              <span className="text-muted-foreground truncate">
                {inputValue || "Search or create topic..."}
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search topics..."
              value={inputValue}
              onValueChange={(val) => {
                setInputValue(val);
                // Clear selection if user types something different
                if (selectedTopic && val !== selectedTopic.canonicalName) {
                  onTopicSelect(null);
                }
              }}
            />
            <CommandList className="max-h-[300px] overflow-y-auto">
              {/* Error state */}
              {error && (
                <div className="flex items-center p-2 text-sm text-destructive bg-destructive/10">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              {/* Loading state */}
              {isSearching && (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Searching...
                  </span>
                </div>
              )}

              {/* Existing topic suggestions */}
              {!isSearching && suggestions.length > 0 && (
                <CommandGroup heading="Existing Topics">
                  {suggestions.map((topic) => (
                    <CommandItem
                      key={topic.id}
                      value={topic.id}
                      onSelect={() => handleSelectTopic(topic)}
                      className="cursor-pointer"
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
                        <span className="font-medium">{topic.canonicalName}</span>
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

              {/* Create new topic option */}
              {!isSearching && inputValue.length >= 2 && !exactMatch && !error && (
                <CommandGroup heading="New Topic">
                  <CommandItem
                    value="create-new"
                    onSelect={handleCreateTopic}
                    disabled={isCreating}
                    className="cursor-pointer text-primary"
                  >
                    {isCreating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    <span>Create "{inputValue}"</span>
                  </CommandItem>
                </CommandGroup>
              )}

              {/* Minimum characters hint */}
              {!isSearching && inputValue.length > 0 && inputValue.length < 2 && (
                <div className="p-4 text-xs text-muted-foreground italic text-center">
                  Type at least 2 characters to search...
                </div>
              )}

              {/* No results state */}
              {!isSearching &&
                inputValue.length >= 2 &&
                suggestions.length === 0 &&
                !exactMatch &&
                !error && (
                  <CommandEmpty className="py-6 text-center text-sm">
                    No existing topics found.
                  </CommandEmpty>
                )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
