import pino from 'pino';

const targets: pino.TransportTargetOptions[] = [
  {
    target: 'pino/file',
    options: { destination: './logs/app.jsonl' },
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
