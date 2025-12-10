import { BrowserFetcher } from '../core/BrowserFetcher.js';
import { Pipeline } from '../core/Pipeline.js';
import { ResponseFormatter, type MCPResponse } from '../core/ResponseFormatter.js';
import { type FetchBrowserArgs } from '../types/schemas.js';
import { logger } from '../shared/Log.js';
import { ConfigContext } from '../shared/ConfigContext.js';
import { Cache } from '../shared/Cache.js';

export class BrowserFetchService {
  private pipeline = Pipeline.getInstance();
  private cache = Cache.getInstance();
  private formatter = new ResponseFormatter();

  async fetch(args: FetchBrowserArgs): Promise<MCPResponse> {
    const { url, max_length, start_index, raw, timeout, useSystemChrome } = args;
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    const ctx = { url, toolName: 'fetch_browser' as const, requestId };
    const formatCtx = { ...ctx, start_index, max_length, raw };

    logger.info({ requestId, url, raw, timeout, useSystemChrome }, 'Browser fetch request started');

    try {
      // 尝试从缓存获取
      let htmlText = this.cache.get(url, 'browser');
      if (!htmlText) {
        const config = ConfigContext.getInstance().getConfig();
        const browserFetcher = new BrowserFetcher({
          timeout: timeout ?? config.browserTimeout,
          useSystemChrome: useSystemChrome ?? config.useSystemChrome,
        });

        htmlText = await browserFetcher.fetch(url);
        if (!htmlText) {
          return this.formatter.formatPhaseError('fetch', ctx);
        }
        this.cache.set(url, 'browser', htmlText);
      }

      const content = raw ? htmlText : await this.pipeline.processToMarkdown(url, htmlText);
      if (!content) {
        return this.formatter.formatPhaseError('process', ctx);
      }

      logger.info({ requestId, url, duration: Date.now() - startTime }, 'Browser fetch request completed');
      return this.formatter.formatContent(content, formatCtx);
    } catch (error) {
      const err = error as Error;
      logger.error(
        { requestId, url, error: err.message, stack: err.stack, duration: Date.now() - startTime },
        'Browser fetch request failed'
      );
      return this.formatter.formatError(err, ctx);
    }
  }
}
