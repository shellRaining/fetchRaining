import type { Dispatcher } from 'undici';
import { logger } from '../shared/Log';

type FetchOptions = RequestInit & { dispatcher?: Dispatcher };

interface Fetcher {
  fetch: (url: string, options?: FetchOptions) => Promise<string | undefined>;
}

export class SimpleFetcher implements Fetcher {
  constructor(private readonly userAgent?: string, private readonly dispatcher?: Dispatcher) {}

  async fetch(url: string, options?: FetchOptions) {
    try {
      const headers = new Headers(options?.headers ?? {});
      if (this.userAgent && !headers.has('user-agent')) {
        headers.set('user-agent', this.userAgent);
      }

      const dispatcher = options?.dispatcher ?? this.dispatcher;
      const signal = options?.signal ?? AbortSignal.timeout(30000); // 30 second timeout

      const response = await fetch(url, {
        ...options,
        headers,
        dispatcher,
        signal,
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
