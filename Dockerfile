FROM oven/bun:1.3.4 AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --ci

COPY . .
RUN bun build src/adapters/cli.ts --target bun --minify --outdir dist

FROM oven/bun:1.3.4-slim
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["bun", "run", "dist/cli.js", "http", "--host", "0.0.0.0", "--port", "3000"]
