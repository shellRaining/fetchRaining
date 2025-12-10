import { logger } from '../shared/Log.js';

export interface TOCItem {
  level: number; // 1-6 (h1-h6)
  text: string;
  id: string; // anchor id
  href: string; // full URL with anchor
}

export class TOCExtractor {
  /**
   * 从 Document 中提取目录结构
   * @param document - JSDOM Document 对象
   * @param baseUrl - 基础 URL，用于生成完整的锚点链接
   * @returns TOC 项数组
   */
  extract(document: Document, baseUrl: string): TOCItem[] {
    try {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const tocItems: TOCItem[] = [];

      // 移除 URL 中已有的 fragment
      const urlWithoutFragment = baseUrl.split('#')[0];

      headings.forEach((heading) => {
        const tagName = heading.tagName.toLowerCase();
        const level = parseInt(tagName.substring(1), 10);
        const text = heading.textContent?.trim() || '';

        // 尝试获取或生成 ID
        let id = heading.id || '';

        // 如果没有 id，尝试从父元素或兄弟元素中查找 anchor
        if (!id) {
          // 查找子元素中的 anchor
          const anchor = heading.querySelector('a[id], a[name]') as HTMLAnchorElement;
          if (anchor) {
            id = anchor.id || anchor.name || '';
          }
        }

        // 如果仍然没有 id，尝试从文本生成一个可能的 id
        // 注意：这只是猜测，可能不准确
        if (!id) {
          id = this.generateIdFromText(text);
        }

        // 构建完整的 href
        const href = id ? `${urlWithoutFragment}#${id}` : urlWithoutFragment;

        tocItems.push({
          level,
          text,
          id,
          href,
        });
      });

      logger.debug(
        {
          url: baseUrl,
          tocItemsCount: tocItems.length,
        },
        'TOC extraction completed'
      );

      return tocItems;
    } catch (error) {
      const err = error as Error;
      logger.error(
        {
          url: baseUrl,
          error: err.message,
          stack: err.stack,
        },
        'TOC extraction error'
      );
      return [];
    }
  }

  /**
   * 从文本生成可能的 ID（slug）
   * 这只是一个猜测，实际页面的 ID 可能不同
   */
  private generateIdFromText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // 移除特殊字符
      .replace(/\s+/g, '-') // 空格转为连字符
      .replace(/^-+|-+$/g, ''); // 移除首尾连字符
  }

  /**
   * 格式化 TOC 为易读的 Markdown 格式
   */
  formatAsMarkdown(items: TOCItem[]): string {
    if (items.length === 0) {
      return '没有找到任何标题';
    }

    const lines = ['# 页面目录 (Table of Contents)', ''];

    for (const item of items) {
      const indent = '  '.repeat(item.level - 1);
      const bullet = '-';
      const anchor = item.id ? ` (#${item.id})` : '';
      lines.push(`${indent}${bullet} ${item.text}${anchor}`);
      if (item.id) {
        lines.push(`${indent}  URL: ${item.href}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * 格式化 TOC 为 JSON 格式
   */
  formatAsJSON(items: TOCItem[]): string {
    return JSON.stringify(items, null, 2);
  }
}
