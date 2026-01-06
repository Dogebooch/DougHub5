'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function SearchBar() {
  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search cards and notes... (Ctrl+K)"
        className="w-full pl-10 h-12 bg-secondary/50 border-white/5 focus-visible:ring-primary/50 text-foreground placeholder:text-muted-foreground transition-all"
      />
    </div>
  );
}
