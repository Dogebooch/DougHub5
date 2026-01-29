import { parseISO, isToday, isYesterday } from 'date-fns';
import { SourceItem, SourceType } from '@/types';

/**
 * Extract wasCorrect value from a qbank SourceItem's rawContent.
 * Returns null for non-qbank items or if parsing fails.
 */
export function getWasCorrect(item: SourceItem): boolean | null {
  if (item.sourceType !== 'qbank') return null;
  try {
    const content = JSON.parse(item.rawContent);
    return content.wasCorrect ?? null;
  } catch {
    return null;
  }
}

/**
 * Count items by source type for filter dropdown display.
 */
export function countBySourceType(items: SourceItem[]): Record<SourceType, number> {
  const counts: Record<SourceType, number> = {
    qbank: 0,
    article: 0,
    pdf: 0,
    image: 0,
    audio: 0,
    quickcapture: 0,
    manual: 0,
  };

  for (const item of items) {
    counts[item.sourceType]++;
  }

  return counts;
}

export interface DateGroup {
  title: 'Today' | 'Yesterday' | 'Earlier';
  items: SourceItem[];
}

/**
 * Group items by date (Today, Yesterday, Earlier).
 * Optionally reverse the order for "oldest first" sorting.
 */
export function groupItemsByDate(
  items: SourceItem[],
  sortOrder: 'newest' | 'oldest' = 'newest'
): DateGroup[] {
  const today: SourceItem[] = [];
  const yesterday: SourceItem[] = [];
  const earlier: SourceItem[] = [];

  for (const item of items) {
    const date = parseISO(item.createdAt);
    if (isToday(date)) {
      today.push(item);
    } else if (isYesterday(date)) {
      yesterday.push(item);
    } else {
      earlier.push(item);
    }
  }

  const groups: DateGroup[] = [
    { title: 'Today', items: today },
    { title: 'Yesterday', items: yesterday },
    { title: 'Earlier', items: earlier },
  ];

  const nonEmptyGroups = groups.filter((g) => g.items.length > 0);

  return sortOrder === 'oldest' ? nonEmptyGroups.reverse() : nonEmptyGroups;
}
