import type { Dispatcher } from 'undici';
import { logger } from '../shared/Log';

type FetchOptions = RequestInit & { dispatcher?: Dispatcher };

interface Fetcher {
  fetch: (url: string, options?: FetchOptions) => Promise<string | undefined>;
}

export class SimpleFetcher implements Fetcher {
  constructor(
    private readonly userAgent?: string,
    private readonly dispatcher?: Dispatcher
  ) {}

  async fetch(url: string, options?: FetchOptions) {
    const startTime = Date.now();

    try {
      const headers = new Headers(options?.headers ?? {});
      if (this.userAgent && !headers.has('user-agent')) {
        headers.set('user-agent', this.userAgent);
      }

      const dispatcher = options?.dispatcher ?? this.dispatcher;
      const signal = options?.signal ?? AbortSignal.timeout(30000);

      const response = await fetch(url, {
        ...options,
        headers,
        dispatcher,
        signal,
      });

      if (!response.ok) {
        logger.error(
          {
            url,
            statusCode: response.status,
            statusText: response.statusText,
            duration: Date.now() - startTime,
          },
          'HTTP fetch failed'
        );
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      logger.debug(
        {
          url,
          statusCode: response.status,
          contentLength: html.length,
          duration: Date.now() - startTime,
        },
        'HTTP fetch completed'
      );

      return html;
    } catch (error) {
      const err = error as Error;
      logger.error(
        {
          url,
          error: err.message,
          duration: Date.now() - startTime,
        },
        'Fetch error'
      );
      throw error;
    }
  }
}
