import Link from 'next/link';
import { SearchBar } from './SearchBar';

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center gap-6 mb-4">
          <Link
            href="/"
            className="text-2xl font-semibold text-foreground hover:text-primary transition-colors"
          >
            DougHub
          </Link>
        </div>
        <SearchBar />
      </div>
    </header>
  );
}
