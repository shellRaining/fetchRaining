import { BrowserFetcher } from '../core/BrowserFetcher.js';
import { BrowserPipeline } from '../core/BrowserPipeline.js';
import { ResponseFormatter, type MCPResponse } from '../core/ResponseFormatter.js';
import { type FetchBrowserArgs } from '../types/schemas.js';
import { logger } from '../shared/Log.js';

export class BrowserFetchService {
  private formatter: ResponseFormatter;
  private pipeline: BrowserPipeline;

  constructor() {
    this.formatter = new ResponseFormatter();
    this.pipeline = new BrowserPipeline();
  }

  async fetch(args: FetchBrowserArgs): Promise<MCPResponse> {
    const { url, max_length, start_index, raw, timeout, useSystemChrome } = args;
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    logger.info(
      {
        requestId,
        url,
        raw,
        timeout,
        useSystemChrome,
      },
      'Browser fetch request started'
    );

    try {
      // 创建 BrowserFetcher
      const browserFetcher = new BrowserFetcher({ timeout, useSystemChrome });

      let content: string;

      if (raw) {
        // 直接返回渲染后的 HTML
        const htmlText = await browserFetcher.fetch(url);

        if (!htmlText) {
          return this.formatter.formatPhaseError('fetch', {
            url,
            toolName: 'fetch_browser',
            requestId,
          });
        }

        content = htmlText;
      } else {
        // 使用浏览器获取 HTML，然后处理
        const htmlText = await browserFetcher.fetch(url);

        if (!htmlText) {
          return this.formatter.formatPhaseError('fetch', {
            url,
            toolName: 'fetch_browser',
            requestId,
          });
        }

        // 使用 BrowserPipeline 处理 HTML
        const markdown = await this.pipeline.process(url, htmlText);

        if (!markdown) {
          return this.formatter.formatPhaseError('process', {
            url,
            toolName: 'fetch_browser',
            requestId,
          });
        }

        content = markdown;
      }

      logger.info(
        {
          requestId,
          url,
          duration: Date.now() - startTime,
        },
        'Browser fetch request completed'
      );

      return this.formatter.formatContent(content, {
        url,
        start_index,
        max_length,
        raw,
        toolName: 'fetch_browser',
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
        'Browser fetch request failed'
      );

      return this.formatter.formatError(err, {
        url,
        toolName: 'fetch_browser',
        requestId,
      });
    }
  }
}
