// src/lib/system-views.ts

import { SmartViewFilter } from './filter-engine';
import {
  Inbox,
  Calendar,
  ClipboardList,
  BookOpen,
  AlertTriangle,
  LucideIcon,
} from "lucide-react";

export interface SystemView {
  id: string;
  name: string;
  icon: LucideIcon;
  filter: SmartViewFilter;
  viewKey: string; // maps to AppView
  description?: string; // tooltip text
}

export const SYSTEM_VIEWS: SystemView[] = [
  {
    id: "inbox",
    name: "Inbox",
    icon: Inbox,
    filter: { status: ["inbox"] },
    viewKey: "inbox",
    description: "Unprocessed captures awaiting review",
  },
  {
    id: "today",
    name: "Today",
    icon: Calendar,
    filter: { createdToday: true },
    viewKey: "today",
    description: "Items captured today",
  },
  {
    id: "queue",
    name: "Queue",
    icon: ClipboardList,
    filter: { sourceType: ["quickcapture"], status: ["inbox"] },
    viewKey: "queue",
    description: "Quick captures ready to process",
  },
  {
    id: "notebook",
    name: "Notebook",
    icon: BookOpen,
    filter: {},
    viewKey: "notebook",
    description: "Curated topic pages and notes",
  },
  {
    id: "weak",
    name: "Weak Topics",
    icon: AlertTriangle,
    filter: { hasLowEase: true },
    viewKey: "weak",
    description: "Cards with low ease scores (<2.0)",
  },
];

export function getSystemViewById(id: string): SystemView | undefined {
  return SYSTEM_VIEWS.find(v => v.id === id);
}
