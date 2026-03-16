import { Command } from 'commander';
import chalk from 'chalk';
import { listAgents } from '../lib/store.js';
export const listCommand = new Command('list')
    .description('列出所有管理的 agents')
    .action(() => {
    const agents = listAgents();
    if (agents.length === 0) {
        console.log(chalk.yellow('\n暂无管理的 agents\n'));
        console.log(chalk.gray('   使用 init 或 import 命令添加\n'));
        return;
    }
    console.log(chalk.blue('\n📋 管理的 Agents:\n'));
    for (const agent of agents) {
        console.log(chalk.white(`  ${agent.name}`));
        console.log(chalk.gray(`    Git:    ${agent.gitDir}`));
        console.log(chalk.gray(`    Remote: ${agent.remote || '-'}`));
        console.log(chalk.gray(`    Sync:   ${new Date(agent.lastSync).toLocaleString()}`));
        console.log();
    }
});
//# sourceMappingURL=list.js.map