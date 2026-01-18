import express from 'express';
import cors from 'cors';
import { Server } from 'http';

export interface CapturePayload {
  timestamp: string;
  url: string;
  hostname: string;
  siteName: 'ACEP PeerPrep' | 'MKSAP 19';
  pageHTML: string;
  bodyText: string;
  images: {
    url: string;
    title: string;
    type: 'fancybox-gallery' | 'inline-image';
    source: 'question' | 'feedback' | 'keypoints' | 'references' | 'other';
  }[];
}

interface CaptureResponse {
  success: boolean;
  id?: string;
  error?: string;
}

let server: Server | null = null;
const PORT = 23847;

/**
 * Starts the Express HTTP server for capturing content from browser extensions.
 */
export function startCaptureServer(onCapture: (payload: CapturePayload) => Promise<string>) {
  if (server) {
    console.log('[Capture Server] Server is already running.');
    return;
  }

  const app = express();

  // CORS: Allow localhost and browser extensions
  app.use(cors({
    origin: (origin, callback) => {
      // Allow browser extensions (chrome-extension://) and localhost
      if (!origin || 
          origin.startsWith('http://localhost') || 
          origin.startsWith('https://localhost') || 
          origin.startsWith('chrome-extension://')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  }));

  // Increase limit for large HTML payloads with images
  app.use(express.json({ limit: '50mb' }));

  app.post('/api/capture', async (req, res) => {
    try {
      const payload = req.body as CapturePayload;

      // Validation
      if (!payload.url || !payload.siteName || !payload.pageHTML) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: url, siteName, or pageHTML'
        } as CaptureResponse);
      }

      // Delegate processing to the provided callback (e.g., in main.ts)
      const id = await onCapture(payload);

      return res.status(200).json({
        success: true,
        id
      } as CaptureResponse);
    } catch (error) {
      console.error('[Capture Server] Error processing capture:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal Server Error'
      } as CaptureResponse);
    }
  });

  server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`[Capture Server] Listening on port ${PORT}`);
  });

  server.on('error', (err: Error & { code?: string }) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Capture Server] Port ${PORT} is already in use.`);
    } else {
      console.error('[Capture Server] Server error:', err);
    }
    server = null;
  });
}

/**
 * Stops the server gracefully.
 */
export function stopCaptureServer() {
  if (server) {
    server.close(() => {
      console.log('[Capture Server] Stopped.');
    });
    server = null;
  }
}

/**
 * Returns whether the server is currently running.
 */
export function isCaptureServerRunning(): boolean {
  return server !== null;
}
/**
 * Returns the port the server is configured to use.
 */
export function getCaptureServerPort(): number {
  return PORT;
}
