'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CanonicalTopic } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface TopicAutocompleteProps {
  value?: CanonicalTopic;
  onSelect: (topic: CanonicalTopic) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * TopicAutocomplete component for selecting or creating canonical topics.
 * 
 * Behavior:
 * - Text input with dropdown suggestions
 * - Debounces 300ms then calls window.api.canonicalTopics.suggestMatches(input)
 * - Shows up to 5 matching topics (handled by backend)
 * - Clicking a suggestion calls onSelect(topic)
 * - If no exact match exists, show "Create new topic" option
 * - Keyboard navigation supported via cmdk
 */
export function TopicAutocomplete({
  value,
  onSelect,
  placeholder = "Select or create topic...",
  disabled = false,
}: TopicAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value?.canonicalName || "");
  const [suggestions, setSuggestions] = React.useState<CanonicalTopic[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [exactMatch, setExactMatch] = React.useState<CanonicalTopic | null>(value || null);
  const { toast } = useToast();

  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const fetchSuggestions = React.useCallback(async (query: string) => {
    if (!query || query.trim().length === 0) {
      setSuggestions([]);
      setExactMatch(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await window.api.canonicalTopics.suggestMatches(query);
      if (response.error) {
        throw new Error(response.error);
      }
      
      const results = response.data || [];
      setSuggestions(results);
      
      const exact = results.find(
        (t: CanonicalTopic) => t.canonicalName.toLowerCase() === query.trim().toLowerCase()
      );
      setExactMatch(exact || null);
    } catch (error) {
      console.error("Failed to fetch topic suggestions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Capture the current value to avoid stale closure issues if needed, 
    // though inputValue is in dependency array.
    const query = inputValue;

    if (query.trim()) {
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(query);
      }, 300);
    } else {
      setSuggestions([]);
      setExactMatch(null);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [inputValue, fetchSuggestions]);

  // Sync state if value prop changes from outside
  React.useEffect(() => {
    if (value) {
      setInputValue(value.canonicalName);
    }
  }, [value]);

  const handleSelect = (topic: CanonicalTopic) => {
    setInputValue(topic.canonicalName);
    setOpen(false);
    onSelect(topic);
  };

  const handleCreateNew = async () => {
    const nameToCreate = inputValue.trim();
    if (!nameToCreate) return;
    
    setLoading(true);
    try {
      const response = await window.api.canonicalTopics.createOrGet(nameToCreate);
      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data) {
        handleSelect(response.data);
      } else {
        throw new Error("No data returned from createOrGet");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not create or retrieve the topic. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between overflow-hidden"
          disabled={disabled}
        >
          <span className="truncate">
            {inputValue || placeholder}
          </span>
          {loading ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0" 
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search topics..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? "Searching..." : "No topics found."}
            </CommandEmpty>
            
            {suggestions.length > 0 && (
              <CommandGroup heading="Suggestions">
                {suggestions.map((topic) => (
                  <CommandItem
                    key={topic.id}
                    value={topic.canonicalName}
                    onSelect={() => handleSelect(topic)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value?.id === topic.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="flex-1 truncate">{topic.canonicalName}</span>
                    {topic.aliases?.length > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({topic.aliases.length} {topic.aliases.length === 1 ? 'alias' : 'aliases'})
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {inputValue.trim() && !exactMatch && !loading && (
              <CommandGroup heading="Actions">
                <CommandItem
                  onSelect={handleCreateNew}
                  className="text-primary font-medium"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="truncate">Create new topic: "{inputValue}"</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
