import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { getAgentMeta, setAgentMeta } from '../lib/store.js';
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
        // 3. 检查 git remote 是否存在
        const remotes = execSync('git remote -v', { cwd: gitDir, encoding: 'utf-8' }).toString();
        if (!remotes.includes('origin')) {
            console.log(chalk.yellow('  ⚠️  未设置远程仓库，使用 publish 命令推送'));
            console.log(chalk.green(`\n✅ 完成！\n`));
            return;
        }
        // 4. Push
        console.log(chalk.gray('  → 推送到远程...'));
        try {
            execSync('git push origin main', { cwd: gitDir, stdio: 'inherit', shell: '/bin/bash' });
        }
        catch {
            // 可能分支是 master
            execSync('git push origin master', { cwd: gitDir, stdio: 'inherit', shell: '/bin/bash' });
        }
        // 5. 更新元数据中的 remote（如果还没设置）
        if (!meta.remote) {
            // 从 git remote URL 解析出 repo 名
            const remoteUrl = execSync('git remote get-url origin', { cwd: gitDir, encoding: 'utf-8' }).toString().trim();
            const match = remoteUrl.match(/github\.com[:/](.+?)(?:\.git)?$/);
            if (match) {
                meta.remote = match[1];
                setAgentMeta(name, meta);
            }
        }
        console.log(chalk.green(`\n✅ 完成！\n`));
    }
    catch (error) {
        console.error(chalk.red(`\n❌ 错误: ${error.message}\n`));
        process.exit(1);
    }
});
//# sourceMappingURL=push.js.map