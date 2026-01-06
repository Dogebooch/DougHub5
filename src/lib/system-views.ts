// src/lib/system-views.ts

import { SmartViewFilter } from './filter-engine';

export interface SystemView {
  id: string;
  name: string;
  icon: string; // emoji for now, Lucide icons deferred
  filter: SmartViewFilter;
  viewKey: string; // maps to AppView
  description?: string; // tooltip text
}

export const SYSTEM_VIEWS: SystemView[] = [
  {
    id: 'inbox',
    name: 'Inbox',
    icon: '📥',
    filter: { status: ['inbox'] },
    viewKey: 'inbox',
    description: 'Unprocessed captures awaiting review',
  },
  {
    id: 'today',
    name: 'Today',
    icon: '📅',
    filter: { createdToday: true },
    viewKey: 'today',
    description: 'Items captured today',
  },
  {
    id: 'queue',
    name: 'Queue',
    icon: '📋',
    filter: { sourceType: ['quickcapture'], status: ['inbox'] },
    viewKey: 'queue',
    description: 'Quick captures ready to process',
  },
  {
    id: 'notebook',
    name: 'Notebook',
    icon: '📚',
    filter: {},
    viewKey: 'notebook',
    description: 'Curated topic pages and notes',
  },
  {
    id: 'weak',
    name: 'Weak Topics',
    icon: '⚠️',
    filter: { hasLowEase: true },
    viewKey: 'weak',
    description: 'Cards with low ease scores (<2.0)',
  },
];

export function getSystemViewById(id: string): SystemView | undefined {
  return SYSTEM_VIEWS.find(v => v.id === id);
}
