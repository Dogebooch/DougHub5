'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function SearchBar() {
  return (
    <div className="relative w-full group">
      <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
      <Input
        type="search"
        placeholder="Search clinical topics... (Ctrl+K)"
        className="w-full pl-12 h-11 bg-black/40 border-black/20 focus-visible:ring-primary/40 focus-visible:bg-black/60 focus-visible:border-primary/30 text-foreground placeholder:text-muted-foreground/30 transition-all font-sans font-medium text-sm rounded-2xl shadow-inner border"
      />
    </div>
  );
}
