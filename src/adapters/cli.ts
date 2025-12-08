#!/usr/bin/env bun

import { Command, InvalidArgumentError } from 'commander';

type Transport = 'http' | 'stdio';

const parseTransport = (value: string): Transport => {
  if (value !== 'http' && value !== 'stdio') {
    throw new InvalidArgumentError('Transport must be "http" or "stdio".');
  }
  return value;
};

const parsePort = (value: string): number => {
  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new InvalidArgumentError('Port must be an integer between 1 and 65535.');
  }
  return port;
};

const program = new Command();

program
  .name('fetchraining')
  .description('Multi-transport MCP server')
  .argument('[transport]', 'Transport mode: http | stdio', parseTransport, 'stdio')
  .option('-t, --transport <transport>', 'Transport mode: http | stdio', parseTransport)
  .option('-p, --port <port>', 'Port for HTTP transport', parsePort)
  .option('-H, --host <host>', 'Hostname for HTTP transport')
  .option('--hostname <hostname>', 'Hostname for HTTP transport')
  .option('-u, --user-agent <userAgent>', 'Custom User-Agent for outbound fetches')
  .option('--proxy-url <proxyUrl>', 'HTTP/HTTPS proxy URL for outbound fetches')
  .allowExcessArguments(false);

const parsed = program.parse(process.argv);

const options = parsed.opts<{
  transport?: Transport;
  port?: number;
  host?: string;
  hostname?: string;
  userAgent?: string;
  proxyUrl?: string;
}>();

const transport = options.transport ?? (parsed.args[0] as Transport);
const port = options.port;
const hostname = options.host ?? options.hostname;
const userAgent = options.userAgent;
const proxyUrl = options.proxyUrl;

// Only allow stdout logging in HTTP mode to avoid corrupting stdio JSON-RPC output.
process.env.LOG_TO_STDOUT = transport === 'http' ? '1' : '0';

const start = async () => {
  const { main } = await import('./server.js');
  await main({ transport, port, hostname, userAgent, proxyUrl });
};

start().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
