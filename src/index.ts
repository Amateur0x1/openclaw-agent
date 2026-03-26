#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { join } from 'path';

function getCliVersion(): string {
  try {
    const packageJson = JSON.parse(
      readFileSync(join(import.meta.dirname, '../package.json'), 'utf-8')
    );
    return packageJson.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

const program = new Command();

program
  .name('openclaw-agent')
  .description('OpenClaw Agent Git Management Tool')
  .version(getCliVersion());

// Dynamically import commands
const commands = [
  './commands/track.js',
  './commands/pull.js',
  './commands/publish.js',
  './commands/list.js',
  './commands/untrack.js',
];

for (const cmd of commands) {
  const module = await import(cmd);
  program.addCommand(module[Object.keys(module)[0]]);
}

program.parse();
