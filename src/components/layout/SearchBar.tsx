'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function SearchBar() {
  return (
    <div className="relative w-full">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
      <Input
        type="search"
        placeholder="Search clinical topics... (Ctrl+K)"
        className="w-full pl-12 h-14 bg-black/40 border-black/20 focus-visible:ring-primary/40 text-foreground placeholder:text-muted-foreground/40 transition-all font-serif italic text-lg rounded-xl shadow-inner"
      />
    </div>
  );
}
