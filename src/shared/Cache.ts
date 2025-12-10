import { LRUCache } from 'lru-cache';
import { logger } from './Log.js';

/**
 * 基于 lru-cache 的 URL 内容缓存
 * 支持 LRU 淘汰、TTL 过期、大小限制
 */
export class Cache {
  private static instance: Cache | null = null;
  private cache: LRUCache<string, string>;

  private constructor(ttl = 10 * 60 * 1000, maxSize = 100) {
    this.cache = new LRUCache<string, string>({
      max: maxSize,
      ttl,
    });
  }

  static getInstance(): Cache {
    if (!this.instance) {
      this.instance = new Cache();
    }
    return this.instance;
  }

  static reset(): void {
    this.instance = null;
  }

  /**
   * 生成缓存 key（移除锚点，因为 HTML 内容与锚点无关）
   */
  private makeKey(url: string, type: 'http' | 'browser'): string {
    try {
      const urlObj = new URL(url);
      urlObj.hash = '';
      return `${type}:${urlObj.href}`;
    } catch {
      return `${type}:${url}`;
    }
  }

  get(url: string, type: 'http' | 'browser'): string | null {
    const key = this.makeKey(url, type);
    const content = this.cache.get(key);
    if (content) {
      logger.info({ url, type }, 'Cache hit');
      return content;
    }
    return null;
  }

  set(url: string, type: 'http' | 'browser', content: string): void {
    const key = this.makeKey(url, type);
    this.cache.set(key, content);
    logger.info({ url, type, contentLength: content.length }, 'Cache set');
  }

  clear(): void {
    this.cache.clear();
    logger.debug('Cache cleared');
  }

  stats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
    };
  }
}
