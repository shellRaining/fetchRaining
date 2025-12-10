import { Pipeline } from '../core/Pipeline.js';
import { SimpleFetcher } from '../core/Fetcher.js';
import { ResponseFormatter, type MCPResponse } from '../core/ResponseFormatter.js';
import { type FetchArgs } from '../types/schemas.js';
import { logger } from '../shared/Log.js';
import { ConfigContext } from '../shared/ConfigContext.js';
import { Cache } from '../shared/Cache.js';

export class FetchService {
  private pipeline = Pipeline.getInstance();
  private cache = Cache.getInstance();
  private fetcher: SimpleFetcher;
  private formatter = new ResponseFormatter();

  constructor() {
    const config = ConfigContext.getInstance().getConfig();
    const dispatcher = ConfigContext.getInstance().createProxyDispatcher();
    this.fetcher = new SimpleFetcher(config.userAgent, dispatcher);
  }

  async fetch(args: FetchArgs): Promise<MCPResponse> {
    const { url, max_length, start_index, raw } = args;
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    const ctx = { url, toolName: 'fetch' as const, requestId };
    const formatCtx = { ...ctx, start_index, max_length, raw };

    logger.info({ requestId, url, raw, start_index, max_length }, 'Fetch request started');

    try {
      // 尝试从缓存获取
      let htmlText = this.cache.get(url, 'http');
      if (!htmlText) {
        htmlText = await this.fetcher.fetch(url);
        if (!htmlText) {
          return this.formatter.formatPhaseError('fetch', ctx);
        }
        this.cache.set(url, 'http', htmlText);
      }

      const content = raw ? htmlText : await this.pipeline.processToMarkdown(url, htmlText);
      if (!content) {
        return this.formatter.formatPhaseError('process', ctx);
      }

      logger.info({ requestId, url, duration: Date.now() - startTime }, 'Fetch request completed');
      return this.formatter.formatContent(content, formatCtx);
    } catch (error) {
      const err = error as Error;
      logger.error(
        { requestId, url, error: err.message, stack: err.stack, duration: Date.now() - startTime },
        'Fetch request failed'
      );
      return this.formatter.formatError(err, ctx);
    }
  }
}
