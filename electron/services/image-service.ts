import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

/**
 * Mapping of MIME types to file extensions
 */
const MIME_MAP: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
};

/**
 * Retry helper with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  delays = [1000, 2000, 4000]
): Promise<T> {
  let lastError: any;
  for (let i = 0; i <= delays.length; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < delays.length) {
        console.warn(`[Image Service] Attempt ${i + 1} failed, retrying in ${delays[i]}ms... URL: ${fn.toString().includes('url') ? 'check logs' : 'unknown'}`);
        await new Promise(resolve => setTimeout(resolve, delays[i]));
      }
    }
  }
  throw lastError;
}

/**
 * Download a single image and save to userData/images/
 * @returns Relative path like 'images/abc123.png'
 */
export async function downloadImage(url: string): Promise<string> {
  const userDataPath = app.getPath('userData');
  const imagesDir = path.join(userDataPath, 'images');

  // Ensure directory exists
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  return await withRetry(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      let origin = '';
      try {
        origin = new URL(url).origin;
      } catch (e) {
        // Fallback or ignore if URL is invalid (unlikely to get here)
      }

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': origin || url
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText} (${url})`);
      }

      const contentType = response.headers.get('content-type');
      let extension = '';
      
      if (contentType) {
        const mime = contentType.split(';')[0].toLowerCase().trim();
        extension = MIME_MAP[mime] || '';
      }

      // Fallback to URL extension if Content-Type didn't help
      if (!extension) {
        try {
          const urlObj = new URL(url);
          const ext = path.extname(urlObj.pathname).toLowerCase();
          if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) {
            extension = ext;
          }
        } catch (e) {
          // Ignore URL parsing errors
        }
      }

      // Final fallback
      if (!extension) extension = '.png';

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const filename = `${crypto.randomUUID()}${extension}`;
      const filePath = path.join(imagesDir, filename);

      fs.writeFileSync(filePath, buffer);

      // Return relative path with forward slashes
      return path.join('images', filename).replace(/\\/g, '/');
    } finally {
      clearTimeout(timeoutId);
    }
  });
}

/**
 * Download multiple images in parallel
 * @returns Array with localPath and location for each successfully downloaded image
 */
export async function downloadBoardQuestionImages(
  imageUrls: Array<{
    url: string;
    location:
      | "vignette"
      | "explanation"
      | "keypoint"
      | "references"
      | "peerpearls";
  }>
): Promise<
  Array<{
    localPath: string;
    location:
      | "vignette"
      | "explanation"
      | "keypoint"
      | "references"
      | "peerpearls";
  }>
> {
  if (!imageUrls || imageUrls.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    imageUrls.map(async (item) => {
      const localPath = await downloadImage(item.url);
      return {
        localPath,
        location: item.location,
      };
    })
  );

  const successfulDownloads: Array<{
    localPath: string;
    location:
      | "vignette"
      | "explanation"
      | "keypoint"
      | "references"
      | "peerpearls";
  }> = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      successfulDownloads.push(result.value);
    } else {
      console.warn(
        `[Image Service] Failed to download image from ${imageUrls[index].url}:`,
        result.reason
      );
    }
  });

  return successfulDownloads;
}
