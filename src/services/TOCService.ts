import { Pipeline } from '../core/Pipeline.js';
import { BrowserFetcher } from '../core/BrowserFetcher.js';
import { BrowserPipeline } from '../core/BrowserPipeline.js';
import { ResponseFormatter, type MCPResponse } from '../core/ResponseFormatter.js';
import { type FetchTOCArgs } from '../types/schemas.js';
import { logger } from '../shared/Log.js';

export class TOCService {
  private pipeline: Pipeline;
  private browserPipeline: BrowserPipeline;
  private formatter: ResponseFormatter;

  constructor(pipeline: Pipeline) {
    this.pipeline = pipeline;
    this.browserPipeline = new BrowserPipeline();
    this.formatter = new ResponseFormatter();
  }

  async extractTOC(args: FetchTOCArgs): Promise<MCPResponse> {
    const { url, format, use_browser, timeout } = args;
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    logger.info(
      {
        requestId,
        url,
        format,
        use_browser,
      },
      'TOC extraction request started'
    );

    try {
      let content: string | null;

      if (use_browser) {
        // 使用浏览器渲染
        logger.info({ requestId, url }, 'Using browser to fetch TOC');
        const browserFetcher = new BrowserFetcher({ timeout });
        const html = await browserFetcher.fetch(url);

        if (!html) {
          return this.formatter.formatPhaseError('fetch', {
            url,
            toolName: 'fetch_toc',
            requestId,
          });
        }

        content = await this.browserPipeline.extractTOC(url, html, format);
      } else {
        // 使用普通 HTTP fetch
        logger.info({ requestId, url }, 'Using HTTP fetch to extract TOC');
        content = await this.pipeline.extractTOC(url, format);
      }

      if (!content) {
        return this.formatter.formatPhaseError('extract', {
          url,
          toolName: 'fetch_toc',
          requestId,
        });
      }

      logger.info(
        {
          requestId,
          url,
          use_browser,
          duration: Date.now() - startTime,
        },
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
        {
          requestId,
          url,
          error: err.message,
          stack: err.stack,
          duration: Date.now() - startTime,
        },
        'TOC extraction request failed'
      );

      return this.formatter.formatError(err, {
        url,
        toolName: 'fetch_toc',
        requestId,
      });
    }
  }
}
