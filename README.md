# fetchraining

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

This project was created using `bun init` in bun v1.3.3. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
