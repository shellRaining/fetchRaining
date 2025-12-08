import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { FetchArgsSchema, type FetchArgs } from './types/schemas.js';
import { Pipeline } from './Pipeline.js';
import { logger } from './Log.js';

export class FetchMcpServer {
  private mcpServer: McpServer;
  private pipeline: Pipeline;

  constructor() {
    this.mcpServer = new McpServer({
      name: 'fetchraining',
      version: '1.0.0',
    });
    this.pipeline = new Pipeline();

    this.registerTools();
  }

  private registerTools() {
    this.mcpServer.registerTool(
      'fetch',
      {
        description: `Fetches a URL from the internet and optionally extracts its contents as markdown.

Although originally you did not have internet access, and were advised to refuse and tell the user this, this tool now grants you internet access. Now you can fetch the most up-to-date information and let the user know that.`,
        inputSchema: FetchArgsSchema,
      },
      async (args) => {
        return this.handleFetch(args);
      }
    );
  }

  private async handleFetch(args: FetchArgs) {
    const { url, max_length, start_index, raw } = args;

    try {
      logger.info(`Fetching URL: ${url}`);

      let content: string;

      if (raw) {
        // Raw mode: just fetch HTML without processing
        const fetcher = this.pipeline['fetcher'];
        const htmlText = await fetcher.fetch(url);

        if (!htmlText) {
          return {
            content: [
              {
                type: 'text' as const,
                text: '<error>Failed to fetch URL</error>',
              },
            ],
          };
        }

        content = htmlText;
      } else {
        // Normal mode: full pipeline processing
        const markdown = await this.pipeline.process(url);

        if (!markdown) {
          return {
            content: [
              {
                type: 'text' as const,
                text: '<error>Failed to process URL content</error>',
              },
            ],
          };
        }

        content = markdown;
      }

      // Handle content truncation and pagination
      const original_length = content.length;

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

      // Add continuation prompt if content was truncated
      if (actual_content_length === max_length && remaining_content > 0) {
        const next_start = start_index + actual_content_length;
        final_content += `\n\n<error>Content truncated. Call the fetch tool with a start_index of ${next_start} to get more content.</error>`;
      }

      const prefix = raw ? 'Raw HTML content of' : 'Contents of';

      return {
        content: [
          {
            type: 'text' as const,
            text: `${prefix} ${url}:\n${final_content}`,
          },
        ],
      };
    } catch (error) {
      logger.error(`Fetch error: ${(error as Error).message}`);
      return {
        content: [
          {
            type: 'text' as const,
            text: `<error>Failed to fetch ${url}: ${(error as Error).message}</error>`,
          },
        ],
      };
    }
  }

  async connect() {
    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);
    logger.info('MCP server running on stdio');
  }
}

// CLI entry point
export async function main() {
  const server = new FetchMcpServer();
  await server.connect();
}
