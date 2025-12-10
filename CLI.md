# CLI 工具使用文档

fetchraining 提供了独立的 CLI 工具，可以直接在命令行中使用，无需启动 MCP 服务器。

## 快速开始

### 使用方式

```bash
# 使用 bun run cli
bun run cli <command> [options]

# 或直接运行
bun run src/adapters/cli.ts <command> [options]
```

### 全局安装（可选）

```bash
# 安装到全局
bun link

# 使用全局命令
fetchraining <command> [options]
```

## 命令列表

### 1. fetch - 轻量级网页获取

使用标准 HTTP 请求获取并转换网页为 Markdown 格式。

```bash
bun run cli fetch <url> [options]
```

**参数：**
- `-m, --max-length <number>` - 返回的最大字符数（默认：5000）
- `-s, --start-index <number>` - 开始返回的字符索引位置（默认：0）
- `-r, --raw` - 返回原始 HTML 内容而不是 Markdown
- `--user-agent <string>` - 自定义 User-Agent
- `--proxy-url <string>` - HTTP/HTTPS 代理 URL
- `--json` - 以 JSON 格式输出结果（包含元数据）

**示例：**

```bash
# 基本用法
bun run cli fetch https://example.com

# 限制返回长度
bun run cli fetch https://example.com --max-length 1000

# 获取原始 HTML
bun run cli fetch https://example.com --raw

# 使用代理
bun run cli fetch https://example.com --proxy-url http://127.0.0.1:8080

# JSON 格式输出
bun run cli fetch https://example.com --json
```

### 2. browser - 浏览器网页获取

使用 Playwright 浏览器获取需要 JavaScript 渲染的页面（SPA、Next.js 等）。

```bash
bun run cli browser <url> [options]
```

**参数：**
- `-m, --max-length <number>` - 返回的最大字符数（默认：5000）
- `-s, --start-index <number>` - 开始返回的字符索引位置（默认：0）
- `-r, --raw` - 返回原始 HTML 内容而不是 Markdown
- `-t, --timeout <number>` - 浏览器页面加载超时时间（毫秒，默认：30000）
- `--no-system-chrome` - 使用 Playwright 内置的 Chromium 而不是系统 Chrome
- `--json` - 以 JSON 格式输出结果（包含元数据）

**示例：**

```bash
# 基本用法
bun run cli browser https://spa-app.com

# 设置超时时间为 60 秒
bun run cli browser https://slow-site.com --timeout 60000

# 使用 Playwright 内置 Chromium
bun run cli browser https://example.com --no-system-chrome

# JSON 格式输出
bun run cli browser https://example.com --json
```

### 3. toc - 网页目录提取

提取网页的目录结构（所有标题 h1-h6），返回层级结构和锚点链接。

```bash
bun run cli toc <url> [options]
```

**参数：**
- `-f, --format <format>` - 输出格式：markdown 或 json（默认：markdown）
- `-b, --use-browser` - 使用浏览器渲染（适用于 SPA 和动态页面）
- `-t, --timeout <number>` - 浏览器页面加载超时时间（毫秒，仅在使用浏览器时有效，默认：30000）
- `--user-agent <string>` - 自定义 User-Agent（仅在非浏览器模式下有效）
- `--proxy-url <string>` - HTTP/HTTPS 代理 URL（仅在非浏览器模式下有效）
- `--json-output` - 以完整 JSON 格式输出结果（包含元数据）

**示例：**

```bash
# 基本用法（Markdown 格式）
bun run cli toc https://developer.mozilla.org/en-US/docs/Web/JavaScript

# JSON 格式输出
bun run cli toc https://example.com --format json

# 使用浏览器模式（适用于 SPA）
bun run cli toc https://spa-page.com --use-browser

# 使用浏览器模式并设置超时
bun run cli toc https://example.com --use-browser --timeout 60000

# 使用代理（非浏览器模式）
bun run cli toc https://example.com --proxy-url http://127.0.0.1:8080
```

## 工作流示例

### 示例 1：先查看目录，再获取特定章节

```bash
# 1. 获取页面目录
bun run cli toc https://docs.example.com/guide --format json

# 2. 从返回的目录中找到感兴趣的章节，例如：
# { "level": 2, "text": "Installation", "id": "installation",
#   "href": "https://docs.example.com/guide#installation" }

# 3. 使用锚点 URL 获取该章节内容
bun run cli fetch "https://docs.example.com/guide#installation"
```

### 示例 2：处理 SPA 页面

```bash
# 对于需要 JavaScript 渲染的页面，使用 browser 命令
bun run cli browser https://react-app.com --timeout 60000

# 提取 SPA 页面的目录
bun run cli toc https://react-app.com --use-browser
```

### 示例 3：导出到文件

```bash
# 导出 Markdown 内容到文件
bun run cli fetch https://example.com > output.md

# 导出 JSON 格式到文件
bun run cli toc https://example.com --format json > toc.json
```

## 输出格式

### 标准输出（默认）

直接输出内容文本到 stdout，方便管道操作和文本处理。

```bash
# 直接查看
bun run cli fetch https://example.com

# 管道到其他命令
bun run cli fetch https://example.com | grep "keyword"

# 保存到文件
bun run cli fetch https://example.com > output.txt
```

### JSON 格式输出

使用 `--json` 或 `--json-output` 参数，输出包含元数据的结构化 JSON。

```bash
bun run cli fetch https://example.com --json
```

输出示例：

```json
{
  "content": [
    {
      "type": "text",
      "text": "页面内容..."
    }
  ],
  "isError": false
}
```

## 错误处理

- 错误信息输出到 stderr
- 成功时退出码为 0
- 失败时退出码为 1

```bash
# 检查命令是否成功
bun run cli fetch https://example.com
echo $?  # 输出 0 表示成功，1 表示失败
```

## 与 MCP 服务器的区别

| 功能 | MCP 服务器 | CLI 工具 |
|------|-----------|----------|
| 使用方式 | 需要通过 MCP 客户端调用 | 直接命令行调用 |
| 启动命令 | `bun start` | `bun run cli` |
| 输出格式 | MCP 协议格式 | 纯文本或 JSON |
| 适用场景 | 集成到 AI 应用中 | 脚本、自动化、人工使用 |
| 传输方式 | stdio / HTTP | stdout |

## 日志

CLI 工具的日志默认只写入文件，不输出到 stdout（避免干扰输出）。

日志文件位置：
- macOS/Linux: `~/.local/state/fetchraining/logs/app.jsonl`
- 或项目目录下的 `./logs/app.jsonl`（如果上述路径创建失败）

## 高级用法

### 批量处理

```bash
# 从文件读取 URL 列表并批量处理
cat urls.txt | while read url; do
  echo "Processing: $url"
  bun run cli fetch "$url" >> all-content.md
  echo -e "\n---\n" >> all-content.md
done
```

### 与其他工具结合

```bash
# 提取内容后用 jq 处理 JSON
bun run cli toc https://example.com --format json | jq '.[] | select(.level == 2)'

# 统计字数
bun run cli fetch https://example.com | wc -w

# 搜索关键词
bun run cli fetch https://example.com | grep -i "keyword"
```

## 故障排查

### 问题：浏览器模式失败

**解决方案：**

1. 确保已安装 Playwright 浏览器：
   ```bash
   bunx playwright install chromium
   ```

2. 或使用系统 Chrome（默认行为）

3. 如果系统 Chrome 有问题，使用内置 Chromium：
   ```bash
   bun run cli browser <url> --no-system-chrome
   ```

### 问题：代理不工作

**解决方案：**

- 代理只在非浏览器模式（`fetch` 和 `toc`）下有效
- 浏览器模式需要通过环境变量设置代理：
  ```bash
  HTTP_PROXY=http://127.0.0.1:8080 bun run cli browser <url>
  ```

### 问题：超时错误

**解决方案：**

增加超时时间：

```bash
bun run cli browser <url> --timeout 60000  # 60 秒
```

## 贡献

欢迎提交 Issue 和 Pull Request！
