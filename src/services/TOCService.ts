import { Pipeline } from '../core/Pipeline.js';
import { SimpleFetcher } from '../core/Fetcher.js';
import { BrowserFetcher } from '../core/BrowserFetcher.js';
import { ResponseFormatter, type MCPResponse } from '../core/ResponseFormatter.js';
import { type FetchTOCArgs } from '../types/schemas.js';
import { logger } from '../shared/Log.js';
import { ConfigContext } from '../shared/ConfigContext.js';
import { Cache } from '../shared/Cache.js';

export class TOCService {
  private pipeline = Pipeline.getInstance();
  private cache = Cache.getInstance();
  private fetcher: SimpleFetcher;
  private formatter = new ResponseFormatter();

  constructor() {
    const config = ConfigContext.getInstance().getConfig();
    const dispatcher = ConfigContext.getInstance().createProxyDispatcher();
    this.fetcher = new SimpleFetcher(config.userAgent, dispatcher);
  }

  async extractTOC(args: FetchTOCArgs): Promise<MCPResponse> {
    const { url, format, use_browser, timeout } = args;
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    const cacheType = use_browser ? 'browser' : 'http';
    logger.info({ requestId, url, format, use_browser }, 'TOC extraction request started');

    try {
      // 尝试从缓存获取
      let html: string | undefined | null = this.cache.get(url, cacheType);

      if (!html) {
        if (use_browser) {
          logger.info({ requestId, url }, 'Using browser to fetch TOC');
          const browserFetcher = new BrowserFetcher({ timeout });
          html = await browserFetcher.fetch(url);
        } else {
          logger.info({ requestId, url }, 'Using HTTP fetch to extract TOC');
          html = await this.fetcher.fetch(url);
        }

        if (!html) {
          return this.formatter.formatPhaseError('fetch', { url, toolName: 'fetch_toc', requestId });
        }
        this.cache.set(url, cacheType, html);
      }

      const content = await this.pipeline.extractTOC(url, html, format);
      if (!content) {
        return this.formatter.formatPhaseError('extract', { url, toolName: 'fetch_toc', requestId });
      }

      logger.info(
        { requestId, url, use_browser, duration: Date.now() - startTime },
        'TOC extraction request completed'
      );
      return this.formatter.formatContent(content, {
        url,
        start_index: 0,
        max_length: content.length,
        raw: false,
        toolName: 'fetch_toc',
        requestId,
      });
    } catch (error) {
      const err = error as Error;
      logger.error(
        { requestId, url, error: err.message, stack: err.stack, duration: Date.now() - startTime },
        'TOC extraction request failed'
      );
      return this.formatter.formatError(err, { url, toolName: 'fetch_toc', requestId });
    }
  }
}
