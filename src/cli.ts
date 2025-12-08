#!/usr/bin/env bun

import { main } from './server.js';

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
