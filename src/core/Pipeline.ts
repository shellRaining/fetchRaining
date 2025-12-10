import { DocumentBuilder } from './Builder.js';
import { ArticleExtracter } from './Extracter.js';
import { FragmentExtractor } from './FragmentExtractor.js';
import { MarkdownTransformer } from './Transformer.js';
import { TOCExtractor } from './TOCExtractor.js';
import { logger } from '../shared/Log.js';

/**
 * Pipeline 负责处理 HTML 内容，提供两种核心功能：
 * 1. 将 HTML 转换为 Markdown
 * 2. 从 HTML 中提取目录 (TOC)
 *
 * 使用单例模式，所有 Service 共享同一个实例
 */
export class Pipeline {
  private static instance: Pipeline | null = null;

  private constructor(
    private builder: DocumentBuilder,
    private extracter: ArticleExtracter,
    private fragmentExtracter: FragmentExtractor,
    private transformer: MarkdownTransformer,
    private tocExtractor: TOCExtractor
  ) {}

  static getInstance(): Pipeline {
    if (!this.instance) {
      this.instance = new Pipeline(
        new DocumentBuilder(),
        new ArticleExtracter(),
        new FragmentExtractor(),
        new MarkdownTransformer(),
        new TOCExtractor()
      );
    }
    return this.instance;
  }

  static reset(): void {
    this.instance = null;
  }

  /**
   * 处理 HTML 并转换为 Markdown
   * 如果 URL 包含锚点片段，会提取该片段的内容
   */
  async processToMarkdown(url: string, html: string): Promise<string | null> {
    const startTime = Date.now();

    try {
      // 1. 构建 DOM 文档
      const document = this.builder.extract(html);
      if (!document) {
        logger.warn({ url, phase: 'build' }, 'Failed to build document');
        return null;
      }

      // 2. 处理锚点片段提取（如果 URL 包含 #fragment）
      const fragment = this.extractFragment(url);
      if (fragment) {
        const fragmentHtml = this.fragmentExtracter.extract(document, fragment);
        if (fragmentHtml) {
          document.body.innerHTML = fragmentHtml;
          logger.debug({ url, fragment }, 'Fragment extracted successfully');
        }
      }

      // 3. 提取文章内容
      const article = this.extracter.extract(document);
      if (!article || !article.content) {
        logger.warn({ url, phase: 'extract' }, 'No article content extracted');
        return null;
      }

      // 4. 转换为 Markdown
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
        'Content processing completed'
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
        'Content processing error'
      );
      throw error;
    }
  }

  /**
   * 从 HTML 中提取目录 (TOC)
   * 注意：不处理 URL 中的锚点片段，总是提取整个页面的目录结构
   */
  async extractTOC(url: string, html: string, format: 'markdown' | 'json' = 'markdown'): Promise<string | null> {
    const startTime = Date.now();

    try {
      // 1. 构建 DOM 文档
      const document = this.builder.extract(html);
      if (!document) {
        logger.warn({ url, phase: 'build' }, 'Failed to build document');
        return null;
      }

      // 2. 不处理 fragment！用户想看整个页面的目录结构

      // 3. 提取文章内容（这样可以过滤掉导航栏、侧边栏、页脚等不相干的标题）
      const article = this.extracter.extract(document);
      if (!article || !article.content) {
        logger.warn({ url, phase: 'extract' }, 'No article content extracted');
        return null;
      }

      // 4. 从正文 HTML 重新构建 Document
      const articleDoc = this.builder.extract(article.content);
      if (!articleDoc) {
        logger.warn({ url, phase: 'build-article' }, 'Failed to build article document');
        return null;
      }

      // 5. 提取目录
      const tocItems = this.tocExtractor.extract(articleDoc, url);

      logger.debug(
        {
          url,
          tocItemsCount: tocItems.length,
          duration: Date.now() - startTime,
        },
        'TOC extraction completed'
      );

      // 6. 格式化输出
      if (format === 'json') {
        return this.tocExtractor.formatAsJSON(tocItems);
      }

      return this.tocExtractor.formatAsMarkdown(tocItems);
    } catch (error) {
      const err = error as Error;
      logger.error(
        {
          url,
          error: err.message,
          stack: err.stack,
          duration: Date.now() - startTime,
        },
        'TOC extraction error'
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
