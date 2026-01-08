export type ContentType = 'text' | 'url' | 'image' | 'qbank';

export function detectContentType(content: string, isImage?: boolean): ContentType {
  if (isImage) return 'image';

  const trimmed = content.trim();

  // URL detection - simple regex for https?:// at the start of a string or just being a URL
  const urlRegex = /^https?:\/\/[^\s]+$/;
  if (urlRegex.test(trimmed)) {
    return 'url';
  }

  // QBank detection - multiple lines with specific markers
  const qbankMarkers = [
    /Question ID:/i,
    /Stem:/i,
    /^[A-E][.\)]\s/m, // e.g. A. B. C. at start of line
  ];

  let matches = 0;
  for (const marker of qbankMarkers) {
    if (marker.test(trimmed)) {
      matches++;
    }
  }

  // If at least two markers are present, call it a QBank question
  if (matches >= 2) {
    return 'qbank';
  }

  return 'text';
}
