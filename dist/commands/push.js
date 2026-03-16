import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { getAgentMeta } from '../lib/store.js';
import { syncFromOpenclaw } from '../lib/git.js';
export const pushCommand = new Command('push')
    .description('推送 agent 到远程')
    .argument('<name>', 'Agent 名称')
    .action(async (name) => {
    try {
        const meta = getAgentMeta(name);
        if (!meta) {
            throw new Error(`未找到 agent: ${name}`);
        }
        console.log(chalk.blue(`\n⬆️  推送 ${name} 到远程\n`));
        const gitDir = meta.gitDir;
        // 1. 同步 OpenClaw 目录到仓库
        console.log(chalk.gray('  → 同步文件到仓库...'));
        syncFromOpenclaw(gitDir, name);
        // 2. Git add & commit
        execSync('git add .', { cwd: gitDir });
        try {
            execSync('git commit -m "update"', { cwd: gitDir });
        }
        catch {
            console.log(chalk.yellow('  ⚠️  没有需要提交的更改'));
        }
        // 3. Push
        if (meta.remote) {
            console.log(chalk.gray('  → 推送到远程...'));
            execSync('git push origin main', { cwd: gitDir, stdio: 'inherit', shell: '/bin/bash' });
        }
        else {
            console.log(chalk.yellow('  ⚠️  未设置远程仓库，使用 publish 命令推送'));
        }
        console.log(chalk.green(`\n✅ 完成！\n`));
    }
    catch (error) {
        console.error(chalk.red(`\n❌ 错误: ${error.message}\n`));
        process.exit(1);
    }
});
//# sourceMappingURL=push.js.map