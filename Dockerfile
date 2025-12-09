FROM oven/bun:1.3.4 AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --ci

COPY . .
# Compile to a self-contained binary for Linux arm64
RUN bun build src/adapters/cli.ts --compile --minify --target=bun-linux-arm64 --outfile fetchraining

FROM gcr.io/distroless/base-debian12:nonroot
WORKDIR /app

COPY --from=builder /app/fetchraining /app/fetchraining

EXPOSE 3000

ENTRYPOINT ["/app/fetchraining", "http", "--host", "0.0.0.0", "--port", "3000"]
