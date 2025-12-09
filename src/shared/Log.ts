import pino from 'pino';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const appName = 'fetchraining';
const homeDir = process.env.HOME ?? homedir();
const xdgStateHome = process.env.XDG_STATE_HOME ?? (homeDir ? join(homeDir, '.local', 'state') : undefined);
const preferredLogDir = xdgStateHome ? join(xdgStateHome, appName, 'logs') : homeDir ? join(homeDir, '.local', 'state', appName, 'logs') : './logs';
let logDir = preferredLogDir;

try {
  mkdirSync(logDir, { recursive: true });
} catch {
  // If the XDG path cannot be created, fallback to a local logs folder.
  logDir = './logs';
  mkdirSync(logDir, { recursive: true });
}

const targets: pino.TransportTargetOptions[] = [
  {
    target: 'pino/file',
    options: { destination: join(logDir, 'app.jsonl') },
  },
];

const logToStdout = (process.env.LOG_TO_STDOUT || '').toLowerCase() === 'true' || process.env.LOG_TO_STDOUT === '1';

if (logToStdout) {
  targets.unshift({
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  });
}

const transport = pino.transport({ targets });

export const logger = pino(transport);
