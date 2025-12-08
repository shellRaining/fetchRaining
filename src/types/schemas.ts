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
