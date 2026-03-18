import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { getAgentMeta } from '../lib/store.js';
import { syncFromOpenclaw } from '../lib/git.js';
export const commitCommand = new Command('commit')
    .description('提交 agent 改动到本地 Git 仓库')
    .argument('<name>', 'Agent 名称')
    .argument('[message]', '提交消息（不填则进入交互模式）')
    .action(async (name, message) => {
    try {
        const meta = getAgentMeta(name);
        if (!meta) {
            throw new Error(`未找到 agent: ${name}`);
        }
        console.log(chalk.blue(`\n📝 提交 agent: ${name}\n`));
        console.log(`   消息: ${message}\n`);
        const gitDir = meta.gitDir;
        // 1. 同步 OpenClaw 目录到仓库
        console.log(chalk.gray('  → 同步文件到仓库...'));
        syncFromOpenclaw(gitDir, name);
        // 2. Git add & commit
        console.log(chalk.gray('  → 提交到 Git...'));
        execSync('git add .', { cwd: gitDir });
        try {
            execSync(`git commit -m "${message}"`, { cwd: gitDir });
            console.log(chalk.green(`  ✓ 已提交\n`));
        }
        catch {
            console.log(chalk.yellow('  ⚠️  没有需要提交的更改\n'));
        }
        if (meta.remote) {
            console.log(chalk.gray(`   运行 ${chalk.blue('openclaw-agent push ' + name)} 推送到远程\n`));
        }
        else {
            console.log(chalk.yellow('  ⚠️  未设置远程仓库，使用 publish 创建\n'));
        }
    }
    catch (error) {
        console.error(chalk.red(`\n❌ 错误: ${error.message}\n`));
        process.exit(1);
    }
});
//# sourceMappingURL=commit.js.map