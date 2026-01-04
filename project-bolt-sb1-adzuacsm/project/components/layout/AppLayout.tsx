'use client';

import { useState, useEffect } from 'react';
import { Header } from './Header';
import { QuickActionsBar } from './QuickActionsBar';
import { CommandPalette } from '@/components/modals/CommandPalette';
import { QuickDumpModal } from '@/components/modals/QuickDumpModal';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isQuickDumpOpen, setIsQuickDumpOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openQuickDump = () => setIsQuickDumpOpen(true);
  const closeQuickDump = () => setIsQuickDumpOpen(false);

  const handleQuickDumpSave = async (content: string) => {
    console.log('Quick Dump content:', content);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <QuickActionsBar onOpenQuickDump={openQuickDump} />
      <main className="mx-auto max-w-7xl px-6 py-12">{children}</main>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenQuickDump={openQuickDump}
      />

      <QuickDumpModal
        isOpen={isQuickDumpOpen}
        onClose={closeQuickDump}
        onSave={handleQuickDumpSave}
      />
    </div>
  );
}
