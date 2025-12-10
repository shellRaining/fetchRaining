import type { Dispatcher } from 'undici';
import { ProxyAgent } from 'undici';
import { logger } from './Log.js';

/**
 * 全局应用配置接口
 */
export interface AppConfig {
  /** HTTP 请求的 User-Agent */
  userAgent?: string;
  /** HTTP/HTTPS 代理 URL */
  proxyUrl?: string;
  /** 浏览器页面加载超时时间（毫秒） */
  browserTimeout?: number;
  /** 是否优先使用系统 Chrome */
  useSystemChrome?: boolean;
}

/**
 * 全局配置上下文（单例模式）
 * 用于在整个应用中共享配置，避免通过构造函数层层传递
 */
export class ConfigContext {
  private static instance: ConfigContext;
  private config: AppConfig = {};

  /**
   * 获取配置上下文单例
   */
  static getInstance(): ConfigContext {
    if (!ConfigContext.instance) {
      ConfigContext.instance = new ConfigContext();
    }
    return ConfigContext.instance;
  }

  /**
   * 设置配置（支持部分更新）
   */
  setConfig(config: Partial<AppConfig>): void {
    this.config = { ...this.config, ...config };
    logger.debug({ config: this.config }, 'Config updated');
  }

  /**
   * 获取当前配置（只读）
   */
  getConfig(): Readonly<AppConfig> {
    return this.config;
  }

  /**
   * 创建 Proxy Dispatcher（如果配置了代理）
   */
  createProxyDispatcher(): Dispatcher | undefined {
    const { proxyUrl } = this.config;
    if (!proxyUrl) {
      return undefined;
    }

    try {
      logger.info({ proxyUrl }, 'Creating proxy dispatcher');
      return new ProxyAgent(proxyUrl);
    } catch (error) {
      logger.error(`Failed to configure proxy (${proxyUrl}): ${(error as Error).message}`);
      return undefined;
    }
  }
}
