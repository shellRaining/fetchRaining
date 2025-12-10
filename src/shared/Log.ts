import pino from 'pino';
import pinoPretty from 'pino-pretty';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const appName = 'fetchraining';
const homeDir = process.env.HOME ?? homedir();
const xdgStateHome = process.env.XDG_STATE_HOME ?? (homeDir ? join(homeDir, '.local', 'state') : undefined);
const preferredLogDir = xdgStateHome
  ? join(xdgStateHome, appName, 'logs')
  : homeDir
    ? join(homeDir, '.local', 'state', appName, 'logs')
    : './logs';
let logDir = preferredLogDir;

try {
  mkdirSync(logDir, { recursive: true });
} catch {
  // If the XDG path cannot be created, fallback to a local logs folder.
  logDir = './logs';
  mkdirSync(logDir, { recursive: true });
}

const logToStdout = (process.env.LOG_TO_STDOUT || '').toLowerCase() === 'true' || process.env.LOG_TO_STDOUT === '1';

const streams: pino.StreamEntry[] = [
  {
    stream: pino.destination({
      dest: join(logDir, 'app.jsonl'),
      sync: false,
    }),
  },
];

if (logToStdout) {
  // Use programmatic pino-pretty instead of transport resolution so it works when compiled into a binary.
  const prettyStream = pinoPretty({
    colorize: true,
  });
  streams.unshift({ stream: prettyStream });
}

export const logger = pino({}, pino.multistream(streams));
