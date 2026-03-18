#!/usr/bin/env node
import { Command } from 'commander';
const program = new Command();
program
    .name('openclaw-agent')
    .description('OpenClaw Agent Git 管理工具')
    .version('1.0.0');
// 动态导入命令
const commands = [
    './commands/track.js',
    './commands/clone.js',
    './commands/import.js',
    './commands/commit.js',
    './commands/push.js',
    './commands/pull.js',
    './commands/sync.js',
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