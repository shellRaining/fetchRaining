import { logger } from '../shared/Log';

interface Fetcher {
  fetch: (url: string, options?: RequestInit) => Promise<string | undefined>;
}

export class SimpleFetcher implements Fetcher {
  constructor(private readonly userAgent?: string) {}

  async fetch(url: string, options?: RequestInit) {
    try {
      const headers = new Headers(options?.headers ?? {});
      if (this.userAgent && !headers.has('user-agent')) {
        headers.set('user-agent', this.userAgent);
      }

      const response = await fetch(url, {
        ...options,
        headers,
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
