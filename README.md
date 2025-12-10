# fetchraining

一个强大的 MCP 服务器，用于获取和处理网页内容。

## 功能

### 1. `fetch` - 轻量级网页获取

使用标准 HTTP 请求获取并转换网页为 Markdown 格式。适合静态网页。

### 2. `fetch_browser` - 浏览器网页获取

使用 Playwright 浏览器获取需要 JavaScript 渲染的页面（SPA、Next.js 等）。

### 3. `fetch_toc` - 网页目录提取 ⭐ 新功能

提取网页的目录结构（所有标题 h1-h6），返回层级结构和锚点链接。

**使用场景：**

- 在读取长篇文档前先了解其结构
- 避免内容过长导致截断
- 使用锚点精确访问特定章节

**获取模式：**

- **HTTP 模式（默认）**：快速，适用于静态页面和 SSR 页面（标题在初始 HTML 中）
- **浏览器模式**：使用 Playwright 渲染 JavaScript，适用于 SPA 和动态渲染的页面

**重要提示：** 某些现代网站（如 Next.js SSR 应用）虽然标题在 HTML 中，但 Readability 提取器可能无法识别内容结构。这种情况下，`fetch` 会失败但 `fetch_toc` 仍能成功提取标题。此时应配合使用 `fetch_browser` 获取完整内容。

**工作流示例：**

```
1. 使用 fetch_toc 获取页面结构（先尝试 HTTP，需要时用浏览器模式）
2. 从目录中找到感兴趣的章节
3. 使用 fetch 或 fetch_browser 配合锚点 URL 读取特定章节
   例如：https://example.com#section-id
```

**输出格式：**

- `markdown`：易读的层级列表（默认）
- `json`：结构化数据，包含 level、text、id 和 href

## 安装

To install dependencies:

```bash
bun install
```

To run (stdio transport):

```bash
bun start
```

To run with Streamable HTTP transport (served at `/mcp`):

```bash
bun run src/adapters/cli.ts http --port=3000
```

Override outbound User-Agent (applies to both transports):

```bash
bun run src/adapters/cli.ts --user-agent="MyCrawler/1.0"
```

Route outbound traffic through a proxy:

```bash
bun run src/adapters/cli.ts http --port=3000 --proxy-url="http://127.0.0.1:8080"
```

## 使用示例

### 提取网页目录

```typescript
// Markdown 格式（默认，HTTP 模式）
const toc = await fetch_toc({
  url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array",
});

// JSON 格式
const toc = await fetch_toc({
  url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array",
  format: "json",
});

// 浏览器模式（用于动态页面）
const toc = await fetch_toc({
  url: "https://example.com/spa-page",
  format: "markdown",
  use_browser: true,
  timeout: 30000,
});
```

### 使用锚点访问特定章节

```typescript
// 1. 先获取目录
const toc = await fetch_toc({
  url: "https://example.com/long-article",
  format: "json",
});

// 2. 从返回的 TOC 中找到感兴趣的章节，比如：
// { "level": 2, "text": "Installation", "id": "installation",
//   "href": "https://example.com/long-article#installation" }

// 3. 使用锚点 URL 获取该章节内容
// 如果是静态页面或 SSR 页面，使用 fetch
const content = await fetch({
  url: "https://example.com/long-article#installation",
});

// 如果 fetch 失败（内容为 "Loading..." 等），使用 fetch_browser
const content = await fetch_browser({
  url: "https://example.com/long-article#installation",
});
```

### 为什么 fetch_toc 能成功但 fetch 失败？

对于某些 SSR（服务器端渲染）网站（如 Next.js、DeepWiki）：

- **标题（h1-h6）在初始 HTML 中**：为了 SEO，服务器端已经渲染好标题
- **但页面布局复杂**：Readability 提取器无法识别主体内容区域
- **结果**：
  - `fetch_toc` 成功：因为标题标签存在
  - `fetch` 失败：只提取到 "Loading..." 等骨架内容

**解决方案**：对这类页面使用 `fetch_browser` 获取完整内容。

This project was created using `bun init` in bun v1.3.3. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
