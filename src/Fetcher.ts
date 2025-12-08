import { logger } from './Log';

interface Fetcher {
  fetch: (url: string, options?: RequestInit) => Promise<string | undefined>;
}

export class SimpleFetcher implements Fetcher {
  async fetch(url: string, options?: RequestInit) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      return html;
    } catch (error) {
      logger.error(`Fetch error: ${(error as Error).message}`);
      throw error;
    }
  }
}
