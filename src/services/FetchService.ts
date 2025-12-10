import { Pipeline } from '../core/Pipeline.js';
import { ResponseFormatter, type MCPResponse } from '../core/ResponseFormatter.js';
import { type FetchArgs } from '../types/schemas.js';
import { logger } from '../shared/Log.js';

export class FetchService {
  private pipeline: Pipeline;
  private formatter: ResponseFormatter;

  constructor(pipeline: Pipeline) {
    this.pipeline = pipeline;
    this.formatter = new ResponseFormatter();
  }

  async fetch(args: FetchArgs): Promise<MCPResponse> {
    const { url, max_length, start_index, raw } = args;
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    logger.info(
      {
        requestId,
        url,
        raw,
        start_index,
        max_length,
      },
      'Fetch request started'
    );

    try {
      let content: string;

      if (raw) {
        const htmlText = await this.pipeline.fetchRaw(url);

        if (!htmlText) {
          return this.formatter.formatPhaseError('fetch', {
            url,
            toolName: 'fetch',
            requestId,
          });
        }

        content = htmlText;
      } else {
        const markdown = await this.pipeline.process(url);

        if (!markdown) {
          return this.formatter.formatPhaseError('process', {
            url,
            toolName: 'fetch',
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
        'Fetch request completed'
      );

      return this.formatter.formatContent(content, {
        url,
        start_index,
        max_length,
        raw,
        toolName: 'fetch',
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
        'Fetch request failed'
      );

      return this.formatter.formatError(err, {
        url,
        toolName: 'fetch',
        requestId,
      });
    }
  }
}
