import { SimpleFetcher } from './Fetcher';
import { DocumentBuilder } from './Builder';
import { ArticleExtracter } from './Extracter';
import { MarkdownTransformer } from './Transformer';
import { logger } from './Log';

export class Pipeline {
  private fetcher: SimpleFetcher;
  private builder: DocumentBuilder;
  private extracter: ArticleExtracter;
  private transformer: MarkdownTransformer;

  constructor() {
    this.fetcher = new SimpleFetcher();
    this.builder = new DocumentBuilder();
    this.extracter = new ArticleExtracter();
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
}

const pipeline = new Pipeline();
const markdown = await pipeline.process(
  'https://shellraining.xyz/docs/reading-notes/mcp/code-execute-with-mcp.html'
);
logger.info(markdown ?? 'No markdown generated.');

