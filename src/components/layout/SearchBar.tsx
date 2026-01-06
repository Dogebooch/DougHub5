'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function SearchBar() {
  return (
    <div className="relative w-full group">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
      <Input
        type="search"
        placeholder="Search... (Ctrl+F)"
        className="w-full pl-9 h-9 bg-black/30 border-white/10 focus-visible:ring-primary/30 focus-visible:bg-black/40 focus-visible:border-primary/20 text-foreground placeholder:text-muted-foreground/40 text-sm rounded-lg"
      />
    </div>
  );
}
