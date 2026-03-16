import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { getAgentMeta, setAgentMeta } from '../lib/store.js';
import { syncToOpenclaw } from '../lib/git.js';
export const pullCommand = new Command('pull')
    .description('从远程拉取 agent')
    .argument('<name>', 'Agent 名称')
    .action(async (name) => {
    try {
        const meta = getAgentMeta(name);
        if (!meta) {
            throw new Error(`未找到 agent: ${name}`);
        }
        console.log(chalk.blue(`\n⬇️  从远程拉取 ${name}\n`));
        const gitDir = meta.gitDir;
        // 1. Pull
        if (meta.remote) {
            console.log(chalk.gray('  → 从远程拉取...'));
            execSync('git pull origin main', { cwd: gitDir, stdio: 'inherit', shell: '/bin/bash' });
        }
        else {
            throw new Error('未设置远程仓库');
        }
        // 2. 同步到 OpenClaw 目录
        console.log(chalk.gray('  → 同步到 OpenClaw...'));
        syncToOpenclaw(gitDir, name);
        // 更新最后同步时间
        meta.lastSync = new Date().toISOString();
        setAgentMeta(name, meta);
        console.log(chalk.green(`\n✅ 完成！\n`));
    }
    catch (error) {
        console.error(chalk.red(`\n❌ 错误: ${error.message}\n`));
        process.exit(1);
    }
});
//# sourceMappingURL=pull.js.map