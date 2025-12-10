#!/usr/bin/env bun

import { Command } from 'commander';
import { FetchService } from '../services/FetchService.js';
import { BrowserFetchService } from '../services/BrowserFetchService.js';
import { TOCService } from '../services/TOCService.js';
import { logger } from '../shared/Log.js';
import { ConfigContext } from '../shared/ConfigContext.js';

// 禁用日志输出到 stdout，避免干扰 CLI 输出
process.env.LOG_TO_STDOUT = '0';

// 优雅退出，确保日志正确关闭
const gracefulExit = (code: number = 0) => {
  logger.flush();
  setTimeout(() => process.exit(code), 100);
};

const program = new Command();

program.name('fetchraining').description('网页抓取和内容提取 CLI 工具').version('1.0.0');

// fetch 命令
program
  .command('fetch')
  .description('使用轻量级 HTTP 请求获取网页内容并转换为 Markdown')
  .argument('<url>', '要获取的 URL')
  .option('-m, --max-length <number>', '返回的最大字符数', '5000')
  .option('-s, --start-index <number>', '开始返回的字符索引位置', '0')
  .option('-r, --raw', '返回原始 HTML 内容而不是 Markdown', false)
  .option('--user-agent <string>', '自定义 User-Agent')
  .option('--proxy-url <string>', 'HTTP/HTTPS 代理 URL')
  .option('--json', '以 JSON 格式输出结果（包含元数据）', false)
  .action(async (url: string, options) => {
    try {
      // 设置全局配置
      ConfigContext.getInstance().setConfig({
        userAgent: options.userAgent,
        proxyUrl: options.proxyUrl,
      });

      const maxLength = parseInt(options.maxLength, 10);
      const startIndex = parseInt(options.startIndex, 10);
      const fetchService = new FetchService();

      const result = await fetchService.fetch({
        url,
        max_length: maxLength,
        start_index: startIndex,
        raw: options.raw,
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        // 提取纯文本内容
        const text = result.content?.[0]?.text;
        if (text) {
          console.log(text);
        } else {
          console.error('错误：未能获取内容');
          gracefulExit(1);
          return;
        }
      }
      gracefulExit(0);
    } catch (error) {
      console.error(`错误: ${(error as Error).message}`);
      gracefulExit(1);
    }
  });

// browser 命令
program
  .command('browser')
  .description('使用浏览器（Playwright）获取需要 JavaScript 渲染的网页内容')
  .argument('<url>', '要获取的 URL')
  .option('-m, --max-length <number>', '返回的最大字符数', '5000')
  .option('-s, --start-index <number>', '开始返回的字符索引位置', '0')
  .option('-r, --raw', '返回原始 HTML 内容而不是 Markdown', false)
  .option('-t, --timeout <number>', '浏览器页面加载超时时间（毫秒）', '30000')
  .option('--no-system-chrome', '使用 Playwright 内置的 Chromium 而不是系统 Chrome')
  .option('--json', '以 JSON 格式输出结果（包含元数据）', false)
  .action(async (url: string, options) => {
    try {
      // 设置全局配置（浏览器相关）
      ConfigContext.getInstance().setConfig({
        browserTimeout: parseInt(options.timeout, 10),
        useSystemChrome: options.systemChrome,
      });

      const maxLength = parseInt(options.maxLength, 10);
      const startIndex = parseInt(options.startIndex, 10);
      const timeout = parseInt(options.timeout, 10);
      const browserFetchService = new BrowserFetchService();

      const result = await browserFetchService.fetch({
        url,
        max_length: maxLength,
        start_index: startIndex,
        raw: options.raw,
        timeout,
        useSystemChrome: options.systemChrome,
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        const text = result.content?.[0]?.text;
        if (text) {
          console.log(text);
        } else {
          console.error('错误：未能获取内容');
          gracefulExit(1);
          return;
        }
      }
      gracefulExit(0);
    } catch (error) {
      console.error(`错误: ${(error as Error).message}`);
      gracefulExit(1);
    }
  });

// toc 命令
program
  .command('toc')
  .description('提取网页的目录结构（所有标题 h1-h6）')
  .argument('<url>', '要提取目录的 URL')
  .option('-f, --format <format>', '输出格式：markdown 或 json', 'markdown')
  .option('-b, --use-browser', '使用浏览器渲染（适用于 SPA 和动态页面）', false)
  .option('-t, --timeout <number>', '浏览器页面加载超时时间（毫秒，仅在使用浏览器时有效）', '30000')
  .option('--user-agent <string>', '自定义 User-Agent（仅在非浏览器模式下有效）')
  .option('--proxy-url <string>', 'HTTP/HTTPS 代理 URL（仅在非浏览器模式下有效）')
  .option('--json-output', '以完整 JSON 格式输出结果（包含元数据）', false)
  .action(async (url: string, options) => {
    try {
      // 设置全局配置
      ConfigContext.getInstance().setConfig({
        userAgent: options.userAgent,
        proxyUrl: options.proxyUrl,
        browserTimeout: parseInt(options.timeout, 10),
      });

      const timeout = parseInt(options.timeout, 10);
      const tocService = new TOCService();

      const result = await tocService.extractTOC({
        url,
        format: options.format as 'markdown' | 'json',
        use_browser: options.useBrowser,
        timeout,
      });

      if (options.jsonOutput) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        const text = result.content?.[0]?.text;
        if (text) {
          console.log(text);
        } else {
          console.error('错误：未能提取目录');
          gracefulExit(1);
          return;
        }
      }
      gracefulExit(0);
    } catch (error) {
      console.error(`错误: ${(error as Error).message}`);
      gracefulExit(1);
    }
  });

program.parse(process.argv);
