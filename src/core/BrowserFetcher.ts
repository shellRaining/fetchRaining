import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { logger } from '../shared/Log';
import { existsSync } from 'fs';

interface BrowserLaunchOptions {
  timeout?: number;
  useSystemChrome?: boolean;
  executablePath?: string;
}

export class BrowserFetcher {
  private timeout: number;
  private useSystemChrome: boolean;
  private executablePath?: string;

  constructor(options: BrowserLaunchOptions = {}) {
    this.timeout = options.timeout ?? 30000;
    this.useSystemChrome = options.useSystemChrome ?? true; // 默认优先使用系统 Chrome
    this.executablePath = options.executablePath;
  }

  /**
   * 尝试查找系统 Chrome/Chromium 路径
   */
  private findSystemChrome(): string | undefined {
    const possiblePaths = [
      // macOS
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
      // Linux
      '/usr/bin/google-chrome',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      // Windows (通过 WSL 也可能需要)
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        logger.info({ path }, 'Found system Chrome/Chromium');
        return path;
      }
    }

    return undefined;
  }

  /**
   * 启动浏览器（智能选择）
   */
  private async launchBrowser(): Promise<Browser> {
    const launchArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];

    // 策略 1: 用户指定了浏览器路径
    if (this.executablePath) {
      logger.info({ executablePath: this.executablePath }, 'Launching with custom browser path');
      return await chromium.launch({
        headless: true,
        executablePath: this.executablePath,
        args: launchArgs,
      });
    }

    // 策略 2: 尝试使用系统 Chrome
    if (this.useSystemChrome) {
      try {
        logger.info('Attempting to use system Chrome via channel');
        return await chromium.launch({
          headless: true,
          channel: 'chrome',
          args: launchArgs,
        });
      } catch (error) {
        logger.warn(`Failed to launch system Chrome via channel: ${(error as Error).message}`);

        // 尝试手动查找系统 Chrome
        const chromePath = this.findSystemChrome();
        if (chromePath) {
          try {
            logger.info({ chromePath }, 'Attempting to use system Chrome via executablePath');
            return await chromium.launch({
              headless: true,
              executablePath: chromePath,
              args: launchArgs,
            });
          } catch (execError) {
            logger.warn(`Failed to launch system Chrome via path: ${(execError as Error).message}`);
          }
        }
      }
    }

    // 策略 3: 回退到 Playwright 自带的 Chromium
    logger.info('Launching Playwright bundled Chromium');
    try {
      return await chromium.launch({
        headless: true,
        args: launchArgs,
      });
    } catch (error) {
      const err = error as Error;
      if (err.message.includes("Executable doesn't exist") || err.message.includes('browserType.launch')) {
        throw new Error('Playwright browsers not installed. Please run: bunx playwright install chromium');
      }
      throw error;
    }
  }

  async fetch(url: string): Promise<string | undefined> {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      // 启动浏览器
      logger.info({ url }, 'Launching browser');
      browser = await this.launchBrowser();

      // 创建页面
      page = await browser.newPage();
      page.setDefaultTimeout(this.timeout);

      // 导航到 URL
      logger.info({ url }, 'Navigating to URL');
      await page.goto(url, {
        timeout: this.timeout,
        waitUntil: 'domcontentloaded',
      });

      // 等待页面主要内容加载（对 SPA 更友好）
      await page.waitForLoadState('load', { timeout: this.timeout }).catch(() => {});
      await page.waitForTimeout(1000);

      // 处理锚点（hash fragment）
      const urlObj = new URL(url);
      if (urlObj.hash) {
        const hash = urlObj.hash.slice(1); // 移除 # 符号
        logger.info({ url, hash }, 'Processing URL fragment');

        try {
          // 尝试滚动到锚点元素
          await page.evaluate((elementId) => {
            const element =
              document.getElementById(elementId) ||
              document.querySelector(`[name="${elementId}"]`) ||
              document.querySelector(`a[name="${elementId}"]`);

            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              return true;
            }
            return false;
          }, hash);

          // 等待滚动完成和可能的动态内容加载
          await page.waitForTimeout(500);
          logger.info({ hash }, 'Scrolled to fragment');
        } catch (error) {
          logger.warn({ hash, error: (error as Error).message }, 'Failed to scroll to fragment');
        }
      }

      // 获取渲染后的 HTML
      const html = await page.content();
      logger.info({ url, htmlLength: html.length }, 'Successfully fetched browser content');

      return html;
    } catch (error) {
      const err = error as Error;
      logger.error({ url, error: err.message }, 'Browser fetch failed');
      throw error;
    } finally {
      // 清理资源
      if (page) await page.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
    }
  }
}
