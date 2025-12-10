import { DocumentBuilder } from './Builder.js';
import { ArticleExtracter } from './Extracter.js';
import { FragmentExtractor } from './FragmentExtractor.js';
import { MarkdownTransformer } from './Transformer.js';
import { logger } from '../shared/Log.js';

export class BrowserPipeline {
  private builder: DocumentBuilder;
  private extracter: ArticleExtracter;
  private fragmentExtracter: FragmentExtractor;
  private transformer: MarkdownTransformer;

  constructor() {
    this.builder = new DocumentBuilder();
    this.extracter = new ArticleExtracter();
    this.fragmentExtracter = new FragmentExtractor();
    this.transformer = new MarkdownTransformer();
  }

  /**
   * 处理浏览器获取的 HTML，转换为 Markdown
   */
  async process(url: string, html: string): Promise<string | null> {
    const startTime = Date.now();

    try {
      // 构建 DOM 文档
      const document = this.builder.extract(html);
      if (!document) {
        logger.warn({ url, phase: 'build' }, 'Failed to build document');
        return null;
      }

      // 处理锚点片段提取
      const fragment = this.extractFragment(url);
      if (fragment) {
        const fragmentHtml = this.fragmentExtracter.extract(document, fragment);
        if (fragmentHtml) {
          document.body.innerHTML = fragmentHtml;
          logger.debug({ url, fragment }, 'Fragment extracted successfully');
        }
      }

      // 提取文章内容
      const article = this.extracter.extract(document);
      if (!article || !article.content) {
        logger.warn({ url, phase: 'extract' }, 'No article content extracted');
        return null;
      }

      // 转换为 Markdown
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
        'Browser pipeline processing completed'
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
        'Browser pipeline processing error'
      );
      throw error;
    }
  }

  /**
   * 提取 URL 中的锚点片段
   */
  private extractFragment(url: string): string {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hash;
    } catch (error) {
      logger.warn(`Failed to parse URL fragment: ${(error as Error).message}`);
      return '';
    }
  }
}
