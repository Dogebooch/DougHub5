import { useState, useEffect, useCallback, useRef } from "react";
import { Check, Loader2, Plus, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
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
  const [inputValue, setInputValue] = useState(suggestedTopicName || "");
  const [suggestions, setSuggestions] = useState<CanonicalTopic[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync input value with selected topic when it changes externally
  useEffect(() => {
    if (selectedTopic) {
      setInputValue(selectedTopic.canonicalName);
    } else if (!isFocused && !inputValue && suggestedTopicName) {
      setInputValue(suggestedTopicName);
    }
  }, [selectedTopic, isFocused, suggestedTopicName]);

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
        setHighlightedIndex(0);
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
    setSuggestions([]);
    setError(null);
    inputRef.current?.blur();
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
        setSuggestions([]);
        inputRef.current?.blur();
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
      s.aliases.some((a) => a.toLowerCase() === inputValue.toLowerCase())
  );

  // Find which part of the input matched for display
  const getMatchReason = (topic: CanonicalTopic): string | null => {
    const lowerInput = inputValue.toLowerCase();
    if (topic.canonicalName.toLowerCase().includes(lowerInput)) {
      return null; // Direct match on canonical name, no need to show
    }
    const matchedAlias = topic.aliases.find((a) =>
      a.toLowerCase().includes(lowerInput)
    );
    if (matchedAlias) {
      return `matches "${matchedAlias}"`;
    }
    return null;
  };

  // Determine if dropdown should show
  const showDropdown =
    isFocused &&
    inputValue.length >= 2 &&
    (suggestions.length > 0 || (!exactMatch && !isSearching) || isSearching || error);

  // Build the list of selectable items for keyboard navigation
  const selectableItems: Array<{ type: "topic"; topic: CanonicalTopic } | { type: "create" }> = [];
  suggestions.forEach((topic) => {
    selectableItems.push({ type: "topic", topic });
  });
  if (inputValue.length >= 2 && !exactMatch && !error && !isSearching) {
    selectableItems.push({ type: "create" });
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || selectableItems.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < selectableItems.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        const item = selectableItems[highlightedIndex];
        if (item) {
          if (item.type === "topic") {
            handleSelectTopic(item.topic);
          } else {
            handleCreateTopic();
          }
        }
        break;
      case "Escape":
        e.preventDefault();
        inputRef.current?.blur();
        break;
    }
  };

  return (
    <div className={cn("space-y-2 relative", className)}>
      <Label htmlFor="topic-input" className="text-sm font-medium flex items-center gap-2">
        📁 Topic
      </Label>

      <div className="relative">
        <Input
          ref={inputRef}
          id="topic-input"
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (selectedTopic && e.target.value !== selectedTopic.canonicalName) {
              onTopicSelect(null);
            }
          }}
          onFocus={() => {
            setIsFocused(true);
            if (inputValue.length >= 2) {
              fetchSuggestions(inputValue);
            }
          }}
          onBlur={() => {
            // Delay to allow click on dropdown items
            setTimeout(() => setIsFocused(false), 200);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type to search or create a topic..."
          className={cn(
            "w-full",
            selectedTopic && "border-primary/50 bg-primary/5"
          )}
          autoComplete="off"
        />

        {/* Selected indicator */}
        {selectedTopic && !isFocused && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Check className="h-4 w-4 text-primary" />
          </div>
        )}

        {/* Loading indicator in input */}
        {isSearching && isFocused && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Dropdown suggestions */}
      {showDropdown && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden"
          style={{ top: "100%" }}
        >
          {/* Error state */}
          {error && (
            <div className="flex items-center p-3 text-sm text-destructive bg-destructive/10">
              <AlertCircle className="mr-2 h-4 w-4 flex-shrink-0" />
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

          {/* Suggestions list */}
          {!isSearching && !error && (
            <div className="max-h-[280px] overflow-y-auto">
              {suggestions.map((topic, index) => {
                const matchReason = getMatchReason(topic);
                const isFirst = index === 0;
                const isHighlighted = highlightedIndex === index;

                return (
                  <div
                    key={topic.id}
                    onClick={() => handleSelectTopic(topic)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors",
                      isHighlighted
                        ? "bg-accent"
                        : "hover:bg-accent/50",
                      index !== suggestions.length - 1 && "border-b border-border/50"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Check
                        className={cn(
                          "h-4 w-4 flex-shrink-0",
                          selectedTopic?.id === topic.id
                            ? "text-primary opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium truncate">
                          {topic.canonicalName}
                        </span>
                        {matchReason && (
                          <span className="text-xs text-muted-foreground">
                            {matchReason}
                          </span>
                        )}
                      </div>
                    </div>

                    {isFirst && suggestions.length > 1 && (
                      <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                        ← Best match
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Create new topic option */}
              {inputValue.length >= 2 && !exactMatch && (
                <div
                  onClick={handleCreateTopic}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors",
                    highlightedIndex === suggestions.length
                      ? "bg-accent text-accent-foreground"
                      : "text-primary hover:bg-accent/50",
                    suggestions.length > 0 && "border-t border-border"
                  )}
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span>Create "{inputValue}" as new topic</span>
                </div>
              )}

              {/* No results - only show create option */}
              {suggestions.length === 0 && !exactMatch && inputValue.length >= 2 && (
                <div className="px-3 py-2 text-sm text-muted-foreground border-b border-border/50">
                  No existing topics found
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hint text when not focused and no topic selected */}
      {!isFocused && !selectedTopic && inputValue.length < 2 && (
        <p className="text-xs text-muted-foreground">
          Type at least 2 characters to search
        </p>
      )}
    </div>
  );
}
