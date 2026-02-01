// src/lib/system-views.ts

import { SmartViewFilter } from "./filter-engine";
import { Inbox, BookOpen, LucideIcon, Image as ImageIcon } from "lucide-react";

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
    id: "notebook",
    name: "Notebook",
    icon: BookOpen,
    filter: {},
    viewKey: "notebook",
    description: "Curated topic pages and notes",
  },
  {
    id: "picture-mnemonic",
    name: "Mnemonics",
    icon: ImageIcon,
    filter: {},
    viewKey: "picture-mnemonic",
    description: "Visual memory anchors",
  },
];

export function getSystemViewById(id: string): SystemView | undefined {
  return SYSTEM_VIEWS.find((v) => v.id === id);
}
