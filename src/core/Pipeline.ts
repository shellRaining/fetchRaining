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
    try {
      const htmlText = await this.fetcher.fetch(url);

      if (!htmlText) {
        logger.warn(`No data fetched from URL: ${url}`);
        return null;
      }

      const document = this.builder.extract(htmlText);
      if (!document) {
        logger.warn(`Failed to build document from fetched data.`);
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
        logger.warn(`No article content extracted from document.`);
        return null;
      }

      const markdown = this.transformer.transform(article.content);
      if (!markdown) {
        logger.warn(`Failed to transform article content to markdown.`);
        return null;
      }

      return markdown;
    } catch (error) {
      logger.error(`Pipeline processing error: ${(error as Error).message}`);
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
