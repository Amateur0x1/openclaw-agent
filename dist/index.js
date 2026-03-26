#!/usr/bin/env node
import { Command } from 'commander';
const program = new Command();
program
    .name('openclaw-agent')
    .description('OpenClaw Agent Git Management Tool')
    .version('1.0.0');
// Dynamically import commands
const commands = [
    './commands/track.js',
    './commands/push.js',
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
//# sourceMappingURL=index.js.map