import { SimpleFetcher } from './Fetcher';
import { DocumentBuilder } from './Builder';
import { ArticleExtracter } from './Extracter';
import { FragmentExtractor } from './FragmentExtractor';
import { MarkdownTransformer } from './Transformer';
import { logger } from './Log';

export class Pipeline {
  private fetcher: SimpleFetcher;
  private builder: DocumentBuilder;
  private extracter: ArticleExtracter;
  private fragmentExtracter: FragmentExtractor;
  private transformer: MarkdownTransformer;

  constructor() {
    this.fetcher = new SimpleFetcher();
    this.builder = new DocumentBuilder();
    this.extracter = new ArticleExtracter();
    this.fragmentExtracter = new FragmentExtractor();
    this.transformer = new MarkdownTransformer();
  }

  async process(url: string) {
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

const pipeline = new Pipeline();
const markdown = await pipeline.process(
  'https://shellraining.xyz/docs/reading-notes/javascript-info/document.html#%E6%B7%B1%E5%85%A5%E8%8A%82%E7%82%B9%E7%B1%BB%E5%9E%8B'
);
logger.info(markdown ?? 'No markdown generated.');
