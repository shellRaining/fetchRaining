import { z } from 'zod';

export const FetchArgsSchema = z.object({
  url: z.string().describe('URL to fetch'),
  max_length: z.number().int().positive().max(1000000).default(5000).describe('Maximum number of characters to return'),
  start_index: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe(
      'On return output starting at this character index, useful if a previous fetch was truncated and more context is required'
    ),
  raw: z.boolean().default(false).describe('Get the actual HTML content of the requested page, without simplification'),
});

export type FetchArgs = z.infer<typeof FetchArgsSchema>;

export const FetchBrowserArgsSchema = z.object({
  url: z.string().describe('URL to fetch'),
  max_length: z.number().int().positive().max(1000000).default(5000).describe('Maximum number of characters to return'),
  start_index: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe(
      'On return output starting at this character index, useful if a previous fetch was truncated and more context is required'
    ),
  raw: z.boolean().default(false).describe('Get the actual HTML content of the requested page, without simplification'),
  timeout: z
    .number()
    .int()
    .positive()
    .default(30000)
    .describe('Browser page load timeout in milliseconds (default: 30000)'),
  useSystemChrome: z
    .boolean()
    .default(true)
    .describe('Whether to use system Chrome browser instead of Playwright bundled Chromium (default: true)'),
});

export type FetchBrowserArgs = z.infer<typeof FetchBrowserArgsSchema>;

export const FetchTOCArgsSchema = z.object({
  url: z.string().describe('URL to fetch and extract table of contents from'),
  format: z
    .enum(['markdown', 'json'])
    .default('markdown')
    .describe('Output format: "markdown" for human-readable format, "json" for structured data'),
  use_browser: z
    .boolean()
    .default(false)
    .describe(
      'Use browser (Playwright) to render JavaScript before extracting TOC. Use for SPAs and dynamically rendered pages.'
    ),
  timeout: z
    .number()
    .int()
    .positive()
    .default(30000)
    .describe('Browser page load timeout in milliseconds (only used when use_browser is true)'),
});

export type FetchTOCArgs = z.infer<typeof FetchTOCArgsSchema>;
