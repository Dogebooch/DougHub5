import React, { useState, useEffect, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, Copy, Check } from "lucide-react";
import { getWindowApi } from "@/lib/safeWindowApi";
import type { ReferenceRange } from "@/types";
import { cn } from "@/lib/utils";

interface ReferenceRangesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReferenceRangesSheet({
  open,
  onOpenChange,
}: ReferenceRangesSheetProps) {
  const [ranges, setRanges] = useState<ReferenceRange[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Load all ranges and categories on mount
  useEffect(() => {
    if (open) {
      loadRanges();
      loadCategories();
    }
  }, [open]);

  // Search or filter when query/category changes
  useEffect(() => {
    if (open) {
      if (searchQuery.trim()) {
        searchRanges(searchQuery);
      } else if (selectedCategory) {
        filterByCategory(selectedCategory);
      } else {
        loadRanges();
      }
    }
  }, [searchQuery, selectedCategory, open]);

  const loadRanges = async () => {
    setLoading(true);
    try {
      const api = getWindowApi();
      if (!api) {
        console.error("Window API not available");
        return;
      }
      const result = await api.referenceRanges.getAll();
      if (result.data) {
        setRanges(result.data);
      }
    } catch (error) {
      console.error("Failed to load reference ranges:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const api = getWindowApi();
      if (!api) return;
      const result = await api.referenceRanges.getCategories();
      if (result.data) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const searchRanges = async (query: string) => {
    setLoading(true);
    try {
      const api = getWindowApi();
      if (!api) return;
      const result = await api.referenceRanges.search(query);
      if (result.data) {
        setRanges(result.data);
      }
    } catch (error) {
      console.error("Failed to search reference ranges:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterByCategory = async (category: string) => {
    setLoading(true);
    try {
      const api = getWindowApi();
      if (!api) return;
      const result = await api.referenceRanges.getByCategory(category);
      if (result.data) {
        setRanges(result.data);
      }
    } catch (error) {
      console.error("Failed to filter by category:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (category: string) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
      setSearchQuery("");
    } else {
      setSelectedCategory(category);
      setSearchQuery("");
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSelectedCategory(null);
  };

  const copyToClipboard = async (range: ReferenceRange) => {
    const text = `${range.test_name}: ${range.normal_range}${range.units ? ` ${range.units}` : ""}${range.notes ? ` (${range.notes})` : ""}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(range.id || null);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const groupedRanges = useMemo(() => {
    const groups: Record<string, ReferenceRange[]> = {};
    ranges.forEach((range) => {
      if (!groups[range.category]) {
        groups[range.category] = [];
      }
      groups[range.category].push(range);
    });
    return groups;
  }, [ranges]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[600px] overflow-hidden flex flex-col"
      >
        <SheetHeader>
          <SheetTitle>Reference Ranges</SheetTitle>
          <SheetDescription>
            MKSAP 19 laboratory reference values
          </SheetDescription>
        </SheetHeader>

        {/* Search Bar */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search test name, category, or value..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedCategory(null);
            }}
            className="pl-9 pr-9"
          />
          {(searchQuery || selectedCategory) && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={handleClearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Category Filter Chips */}
        {!searchQuery && (
          <div className="flex flex-wrap gap-2 mt-3">
            {categories.map((category) => (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                className="cursor-pointer hover:bg-accent"
                onClick={() => handleCategoryClick(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        )}

        {/* Results */}
        <ScrollArea className="flex-1 mt-4 -mx-6 px-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : ranges.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery || selectedCategory
                ? "No results found"
                : "No reference ranges available"}
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {Object.entries(groupedRanges).map(([category, categoryRanges]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                    {category}
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[35%]">Test</TableHead>
                        <TableHead className="w-[45%]">Normal Range</TableHead>
                        <TableHead className="w-[20%] text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryRanges.map((range) => (
                        <TableRow key={range.id} className="group">
                          <TableCell className="font-medium">
                            {range.test_name}
                            {range.notes && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {range.notes}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-sm">
                              {range.normal_range}
                              {range.units && (
                                <span className="text-muted-foreground ml-1">
                                  {range.units}
                                </span>
                              )}
                            </div>
                            {range.si_range && (
                              <div className="text-xs text-muted-foreground mt-1 font-mono">
                                {range.si_range}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity",
                                copiedId === range.id && "opacity-100"
                              )}
                              onClick={() => copyToClipboard(range)}
                              title="Copy to clipboard"
                            >
                              {copiedId === range.id ? (
                                <Check className="h-4 w-4 text-success" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer Info */}
        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground text-center">
          {ranges.length > 0 && `${ranges.length} test${ranges.length !== 1 ? "s" : ""} • `}
          Source: MKSAP 19
        </div>
      </SheetContent>
    </Sheet>
  );
}
