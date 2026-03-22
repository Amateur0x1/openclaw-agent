import { Command } from 'commander';
import chalk from 'chalk';
import { listAgents } from '../lib/store.js';
export const listCommand = new Command('list')
    .description('List all agents managed by openclaw-agent')
    .action(() => {
    const agents = listAgents();
    if (agents.length === 0) {
        console.log(chalk.yellow('\nNo managed agents yet\n'));
        console.log(chalk.gray('   Use track or import to add one\n'));
        return;
    }
    console.log(chalk.blue('\n📋 Managed Agents:\n'));
    for (const agent of agents) {
        const agentId = agent.config?.id || agent.name;
        console.log(chalk.white(`  ${agentId}`));
        console.log(chalk.gray(`    Git:    ${agent.gitDir}`));
        console.log(chalk.gray(`    Remote: ${agent.remote || '-'}`));
        console.log(chalk.gray(`    Sync:   ${new Date(agent.lastSync).toLocaleString()}`));
        console.log();
    }
});
//# sourceMappingURL=list.js.map