'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/stores/useAppStore';

interface QuickActionsBarProps {
  onOpenQuickDump: () => void;
}

export function QuickActionsBar({ onOpenQuickDump }: QuickActionsBarProps) {
  const [mounted, setMounted] = useState(false);
  const getCardsDueToday = useAppStore((state) => state.getCardsDueToday);
  const isHydrated = useAppStore((state) => state.isHydrated);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dueCount = mounted && isHydrated ? getCardsDueToday().length : 0;

  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="default"
              size="lg"
              className="min-h-[44px]"
              onClick={onOpenQuickDump}
            >
              Quick Dump
            </Button>
            <Button
              asChild
              variant="secondary"
              size="lg"
              className="min-h-[44px] gap-2"
            >
              <Link href="/review">
                <span>Due Today:</span>
                <Badge variant="outline" className="ml-1 bg-background">
                  {dueCount}
                </Badge>
              </Link>
            </Button>
          </div>
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="min-h-[44px] min-w-[44px]"
          >
            <Link href="/settings">
              <Settings className="h-5 w-5" />
              <span className="sr-only">Settings</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
