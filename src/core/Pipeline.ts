import { SimpleFetcher } from './Fetcher';
import { DocumentBuilder } from './Builder';
import { ArticleExtracter } from './Extracter';
import { FragmentExtractor } from './FragmentExtractor';
import { MarkdownTransformer } from './Transformer';
import { logger } from '../shared/Log';
import type { Dispatcher } from 'undici';

export class Pipeline {
  private fetcher: SimpleFetcher;
  private builder: DocumentBuilder;
  private extracter: ArticleExtracter;
  private fragmentExtracter: FragmentExtractor;
  private transformer: MarkdownTransformer;

  constructor(options?: { userAgent?: string; dispatcher?: Dispatcher }) {
    this.fetcher = new SimpleFetcher(options?.userAgent, options?.dispatcher);
    this.builder = new DocumentBuilder();
    this.extracter = new ArticleExtracter();
    this.fragmentExtracter = new FragmentExtractor();
    this.transformer = new MarkdownTransformer();
  }

  async fetchRaw(url: string, options?: RequestInit) {
    return this.fetcher.fetch(url, options);
  }

  async process(url: string) {
    const startTime = Date.now();

    try {
      const htmlText = await this.fetcher.fetch(url);

      if (!htmlText) {
        logger.warn({ url, phase: 'fetch' }, 'No data fetched from URL');
        return null;
      }

      const document = this.builder.extract(htmlText);
      if (!document) {
        logger.warn({ url, phase: 'build' }, 'Failed to build document');
        return null;
      }

      const fragment = this.extractFragment(url);
      if (fragment) {
        const fragmentHtml = this.fragmentExtracter.extract(document, fragment);
        if (fragmentHtml) {
          document.body.innerHTML = fragmentHtml;
        }
      }

      const article = this.extracter.extract(document);
      if (!article || !article.content) {
        logger.warn({ url, phase: 'extract' }, 'No article content extracted');
        return null;
      }

      const markdown = this.transformer.transform(article.content);
      if (!markdown) {
        logger.warn({ url, phase: 'transform' }, 'Failed to transform to markdown');
        return null;
      }

      logger.debug(
        {
          url,
          markdownLength: markdown.length,
          duration: Date.now() - startTime,
        },
        'Pipeline processing completed'
      );

      return markdown;
    } catch (error) {
      const err = error as Error;
      logger.error(
        {
          url,
          error: err.message,
          stack: err.stack,
          duration: Date.now() - startTime,
        },
        'Pipeline processing error'
      );
      throw error;
    }
  }

  private extractFragment(url: string) {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hash;
    } catch (error) {
      logger.warn(`Failed to parse URL fragment: ${(error as Error).message}`);
      return '';
    }
  }
}
