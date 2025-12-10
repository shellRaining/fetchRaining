import { logger } from '../shared/Log.js';

export interface MCPResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  [x: string]: unknown;
}

export interface FormatOptions {
  url: string;
  start_index: number;
  max_length: number;
  raw: boolean;
  toolName: string;
  requestId?: string;
}

export class ResponseFormatter {
  formatContent(content: string, options: FormatOptions): MCPResponse {
    const { url, start_index, max_length, raw, toolName, requestId } = options;
    const original_length = content.length;

    // 检查 start_index 是否超出内容长度
    if (start_index >= original_length) {
      return {
        content: [
          {
            type: 'text' as const,
            text: '<error>No more content available.</error>',
          },
        ],
      };
    }

    // 截取内容
    const truncated_content = content.slice(start_index, start_index + max_length);

    if (!truncated_content) {
      return {
        content: [
          {
            type: 'text' as const,
            text: '<error>No more content available.</error>',
          },
        ],
      };
    }

    let final_content = truncated_content;
    const actual_content_length = truncated_content.length;
    const remaining_content = original_length - (start_index + actual_content_length);

    // 如果内容被截断，添加继续提示
    if (actual_content_length === max_length && remaining_content > 0) {
      const next_start = start_index + actual_content_length;
      final_content += `\n\n<error>Content truncated. Call ${toolName} with start_index=${next_start} to get more content.</error>`;
    }

    // 根据工具类型和 raw 模式生成前缀
    const prefix = raw
      ? toolName === 'fetch_browser'
        ? 'Raw HTML content (browser-rendered) of'
        : 'Raw HTML content of'
      : toolName === 'fetch_browser'
        ? 'Contents (browser-rendered) of'
        : 'Contents of';

    if (requestId) {
      logger.info(
        {
          requestId,
          url,
          statusCode: 200,
          contentLength: original_length,
          returnedLength: actual_content_length,
          truncated: actual_content_length === max_length,
        },
        `${toolName} request completed`
      );
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: `${prefix} ${url}:\n${final_content}`,
        },
      ],
    };
  }

  formatError(error: Error, options: Pick<FormatOptions, 'url' | 'toolName' | 'requestId'>): MCPResponse {
    const { url, toolName, requestId } = options;

    if (requestId) {
      logger.error(
        {
          requestId,
          url,
          error: error.message,
          stack: error.stack,
        },
        `${toolName} request failed`
      );
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: `<error>Failed to fetch ${url}${toolName === 'fetch_browser' ? ' with browser' : ''}: ${error.message}</error>`,
        },
      ],
    };
  }

  formatPhaseError(phase: string, options: Pick<FormatOptions, 'url' | 'toolName' | 'requestId'>): MCPResponse {
    const { url, toolName, requestId } = options;

    if (requestId) {
      logger.error({ requestId, url, phase }, `Failed at ${phase} phase`);
    }

    const errorMessages: Record<string, string> = {
      fetch: 'Failed to fetch URL',
      process: 'Failed to process URL content',
      build: 'Failed to build document',
      extract: 'Failed to extract content from page',
      transform: 'Failed to transform content to markdown',
    };

    const errorMessage = errorMessages[phase] || `Failed at ${phase} phase`;

    return {
      content: [
        {
          type: 'text' as const,
          text: `<error>${errorMessage}${toolName === 'fetch_browser' ? ' (browser)' : ''}</error>`,
        },
      ],
    };
  }
}
