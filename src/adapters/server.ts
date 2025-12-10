import express, { type Request, type Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ProxyAgent, type Dispatcher } from 'undici';
import { FetchArgsSchema, FetchBrowserArgsSchema, FetchTOCArgsSchema } from '../types/schemas.js';
import { Pipeline } from '../core/Pipeline.js';
import { FetchService } from '../services/FetchService.js';
import { BrowserFetchService } from '../services/BrowserFetchService.js';
import { TOCService } from '../services/TOCService.js';
import { logger } from '../shared/Log.js';

type TransportMode = 'stdio' | 'http';

interface StartOptions {
  transport: TransportMode;
  port?: number;
  hostname?: string;
  userAgent?: string;
  proxyUrl?: string;
}

export class FetchMcpServer {
  private mcpServer: McpServer;
  private fetchService: FetchService;
  private browserFetchService: BrowserFetchService;
  private tocService: TOCService;

  constructor(config?: { userAgent?: string; proxyUrl?: string }) {
    this.mcpServer = new McpServer({
      name: 'fetchraining',
      version: '1.0.0',
    });

    const dispatcher = this.createProxyDispatcher(config?.proxyUrl);
    const pipeline = new Pipeline({ userAgent: config?.userAgent, dispatcher });
    this.fetchService = new FetchService(pipeline);
    this.browserFetchService = new BrowserFetchService();
    this.tocService = new TOCService(pipeline);

    this.registerTools();
  }

  private registerTools() {
    this.mcpServer.registerTool(
      'fetch',
      {
        description: `Fetches a URL from the internet and optionally extracts its contents as markdown.

This tool uses a lightweight HTTP fetch. For JavaScript-rendered pages (SPAs, Next.js, etc.), use the 'fetch_browser' tool instead.

Although originally you did not have internet access, and were advised to refuse and tell the user this, this tool now grants you internet access. Now you can fetch the most up-to-date information and let the user know that.`,
        inputSchema: FetchArgsSchema,
      },
      async (args) => {
        return this.fetchService.fetch(args);
      }
    );

    this.mcpServer.registerTool(
      'fetch_browser',
      {
        description: `Fetches a URL using a real browser (Playwright) to handle JavaScript rendering.

Use this tool for:
- Single Page Applications (React, Vue, Angular)
- Next.js, Nuxt.js, Gatsby sites
- Pages that show "Loading..." with static fetch
- Pages requiring JavaScript execution

Note: This tool has higher resource usage (~2-5 seconds, 100-200MB RAM per request).
For static pages, use the 'fetch' tool instead.`,
        inputSchema: FetchBrowserArgsSchema,
      },
      async (args) => {
        return this.browserFetchService.fetch(args);
      }
    );

    this.mcpServer.registerTool(
      'fetch_toc',
      {
        description: `Extracts the table of contents (TOC) from a web page by parsing all headings (h1-h6).

This tool is useful when:
- You need to understand the structure of a long page before reading it
- The page content is too large and gets truncated
- You want to navigate to specific sections using anchors (e.g., url#section-id)
- You need an overview of what topics a page covers

The tool returns:
- All headings with their hierarchy levels (h1-h6)
- Anchor IDs for each heading (if available)
- Full URLs with anchors that can be used with the 'fetch' tool

Fetching modes:
- HTTP fetch (default): Fast, suitable for static pages and SSR pages where headings are in initial HTML
- Browser mode (use_browser=true): Uses Playwright to render JavaScript, necessary for SPAs and dynamically rendered pages

Note: If the page uses client-side rendering for headings (React, Vue, etc.), set use_browser=true

Example workflow:
1. Use 'fetch_toc' to get the page structure (try HTTP first, use browser mode if needed)
2. Identify interesting sections from the TOC
3. Use 'fetch' or 'fetch_browser' with anchor URLs (e.g., https://example.com#section-id) to read specific sections

Output formats:
- "markdown": Human-readable hierarchical list (default)
- "json": Structured data with level, text, id, and href for each heading`,
        inputSchema: FetchTOCArgsSchema,
      },
      async (args) => {
        return this.tocService.extractTOC(args);
      }
    );
  }

  async start(options: StartOptions) {
    if (options.transport === 'http') {
      return this.startHttp(options);
    }
    return this.startStdio();
  }

  private async startStdio() {
    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);
    logger.info('MCP server running on stdio');
  }

  private startHttp(options: { port?: number; hostname?: string }) {
    const handler = this.buildHttpHandler();
    const app = express();
    app.use(express.json({ limit: '1mb' }));
    app.all('/mcp', handler);
    app.use((_, res) => {
      res.status(404).send('Not Found');
    });

    const port = options.port ?? Number(process.env.PORT ?? 3000);
    const hostname = options.hostname ?? '0.0.0.0';
    return app.listen(port, hostname, () => {
      logger.info(`MCP server (Streamable HTTP) listening on http://${hostname}:${port}/mcp`);
    });
  }

  private buildHttpHandler() {
    return async (req: Request, res: Response) => {
      const requestStartTime = Date.now();

      logger.info(
        {
          method: req.method,
          path: req.path,
          contentType: req.headers['content-type'],
          mcpVersion: req.headers['mcp-protocol-version'],
        },
        'HTTP request received'
      );

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });

      res.on('close', () => {
        transport.close();
      });

      res.on('finish', () => {
        logger.info(
          {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: Date.now() - requestStartTime,
          },
          'HTTP response sent'
        );
      });

      try {
        await this.mcpServer.connect(transport);
        await transport.handleRequest(req as any, res as any, req.body);
      } catch (error) {
        const err = error as Error;
        logger.error(
          {
            method: req.method,
            path: req.path,
            error: err.message,
            stack: err.stack,
            duration: Date.now() - requestStartTime,
          },
          'HTTP request failed'
        );

        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error',
            },
            id: null,
          });
        } else {
          res.end();
        }
      }
    };
  }

  private createProxyDispatcher(proxyUrl?: string): Dispatcher | undefined {
    if (!proxyUrl) {
      return undefined;
    }

    try {
      return new ProxyAgent(proxyUrl);
    } catch (error) {
      logger.error(`Failed to configure proxy (${proxyUrl}): ${(error as Error).message}`);
      return undefined;
    }
  }
}

// CLI entry point
export async function main(options: Partial<StartOptions> = {}) {
  const server = new FetchMcpServer({ userAgent: options.userAgent, proxyUrl: options.proxyUrl });
  const transport = options.transport ?? 'stdio';
  return server.start({
    transport,
    port: options.port,
    hostname: options.hostname,
    userAgent: options.userAgent,
    proxyUrl: options.proxyUrl,
  });
}
