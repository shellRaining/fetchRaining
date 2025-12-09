import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { logger } from '../shared/Log';

interface Transformer {
  transform: (data: string) => string | undefined;
}

export class MarkdownTransformer implements Transformer {
  private turndownService: TurndownService;

  constructor() {
    this.turndownService = new TurndownService({
      bulletListMarker: '-',
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      hr: '---',
    });
    this.turndownService.use(gfm);
  }

  transform(data: string) {
    try {
      return this.turndownService.turndown(data);
    } catch (error) {
      logger.error(`Markdown transformation error: ${(error as Error).message}`);
    }
  }
}
