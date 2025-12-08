import { logger } from '../shared/Log';
import { JSDOM } from 'jsdom';

interface Builder {
  extract: (data: string) => Document | undefined;
}

export class DocumentBuilder implements Builder {
  extract(data: string) {
    try {
      const { document } = new JSDOM(data).window;
      return document;
    } catch (error) {
      logger.info(`Document build error: ${(error as Error).message}`);
    }
  }
}
