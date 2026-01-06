// src/lib/filter-engine.ts

import { SourceItem } from '@/types';

export interface SmartViewFilter {
  status?: string[]; // ['inbox', 'processed']
  sourceType?: string[]; // ['qbank', 'article']
  topicIds?: string[]; // specific canonical topic IDs
  tags?: string[]; // tag matches (any)
  hasLowEase?: boolean; // cards with ease < 2.0
  createdToday?: boolean; // createdAt is today
}

/**
 * Filter Engine for SourceItems based on SmartView criteria.
 * All defined criteria are applied as AND conditions.
 */
export function applyFilter(items: SourceItem[], filter: SmartViewFilter): SourceItem[] {
  // Return all items if filter is empty (technically if no keys are defined)
  if (Object.keys(filter).length === 0) {
    return items;
  }

  return items.filter(item => {
    // status: item.status in filter.status array
    if (filter.status && filter.status.length > 0) {
      if (!filter.status.includes(item.status)) {
        return false;
      }
    }

    // sourceType: item.sourceType in filter.sourceType array
    if (filter.sourceType && filter.sourceType.length > 0) {
      if (!filter.sourceType.includes(item.sourceType)) {
        return false;
      }
    }

    // topicIds: any of item.canonicalTopicIds intersects filter.topicIds
    if (filter.topicIds && filter.topicIds.length > 0) {
      const hasTopicMatch = item.canonicalTopicIds.some(id => filter.topicIds?.includes(id));
      if (!hasTopicMatch) {
        return false;
      }
    }

    // tags: any of item.tags intersects filter.tags
    if (filter.tags && filter.tags.length > 0) {
      const hasTagMatch = item.tags.some(tag => filter.tags?.includes(tag));
      if (!hasTagMatch) {
        return false;
      }
    }

    // createdToday: createdAt is today
    if (filter.createdToday) {
      const itemDate = new Date(item.createdAt).toDateString();
      const todayDate = new Date().toDateString();
      if (itemDate !== todayDate) {
        return false;
      }
    }

    // hasLowEase: skipped for SourceItems (requires Card ease data)
    // This is handled at the card level in future tasks.
    
    return true;
  });
}
