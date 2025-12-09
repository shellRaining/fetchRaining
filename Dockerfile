FROM oven/bun:1.3.4 AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --ci

COPY . .

# -------- Runtime (non-compiled) image --------
FROM oven/bun:1.3.4 AS runtime
WORKDIR /app
COPY --from=deps /app /app
EXPOSE 3000
CMD ["bun", "run", "src/adapters/cli.ts", "http", "--host", "0.0.0.0", "--port", "3000"]

# -------- Distroless compiled image --------
FROM deps AS builder
# Compile to a self-contained binary for Linux arm64
RUN bun build src/adapters/cli.ts --compile --minify --target=bun-linux-arm64 --outfile fetchraining

FROM gcr.io/distroless/base-debian12:nonroot AS distroless
WORKDIR /app
COPY --from=builder /app/fetchraining /app/fetchraining
# jsdom reads a default stylesheet from its package path; copy the files so the compiled binary can find them.
COPY --from=deps /app/node_modules/jsdom /app/node_modules/jsdom
EXPOSE 3000
ENTRYPOINT ["/app/fetchraining", "http", "--host", "0.0.0.0", "--port", "3000"]
