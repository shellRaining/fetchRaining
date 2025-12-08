import { logger } from '../shared/Log';
import { Readability } from '@mozilla/readability';

interface Extracter {
  extract: (data: Document) => any;
}

export class ArticleExtracter implements Extracter {
  extract(data: Document) {
    try {
      const reader = new Readability(data);
      const article = reader.parse();
      return article;
    } catch (error) {
      logger.error(`Article extraction error: ${(error as Error).message}`);
    }
  }
}
