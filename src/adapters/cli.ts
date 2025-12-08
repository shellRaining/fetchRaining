#!/usr/bin/env bun

const args = process.argv.slice(2);

const transportArg = args.find((arg) => arg === 'http' || arg === 'stdio' || arg.startsWith('--transport='));
const transport = (transportArg?.replace('--transport=', '') as 'http' | 'stdio' | undefined) ?? ('stdio' as const);

const portArg = args.find((arg) => arg.startsWith('--port='));
const hostnameArg = args.find((arg) => arg.startsWith('--host=') || arg.startsWith('--hostname='));
const port = portArg ? Number(portArg.split('=')[1]) : undefined;
const hostname = hostnameArg ? hostnameArg.split('=')[1] : undefined;

// Only allow stdout logging in HTTP mode to avoid corrupting stdio JSON-RPC output.
process.env.LOG_TO_STDOUT = transport === 'http' ? '1' : '0';

const start = async () => {
  const { main } = await import('./server.js');
  await main({ transport, port, hostname });
};

start().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
