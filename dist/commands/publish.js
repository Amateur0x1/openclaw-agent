import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { getAgentMeta, setAgentMeta } from '../lib/store.js';
import { getGhUsername, createGitHubRepo, getSshUrl } from '../lib/github.js';
export const publishCommand = new Command('publish')
    .description('发布 agent 到 GitHub')
    .argument('<name>', 'Agent 名称')
    .option('-r, --repo <name>', 'GitHub 仓库名称（默认: openclaw-agent-{name}）')
    .action(async (name, options) => {
    try {
        const meta = getAgentMeta(name);
        if (!meta) {
            throw new Error(`未找到 agent: ${name}`);
        }
        if (meta.remote) {
            console.log(chalk.yellow(`⚠️  Agent "${name}" 已有远程仓库: ${meta.remote}`));
            console.log(chalk.gray('   使用 push 命令推送更新\n'));
            return;
        }
        const repoName = options.repo || `openclaw-agent-${name}`;
        const username = getGhUsername();
        console.log(chalk.blue(`\n🚀 发布 ${name} 到 GitHub\n`));
        console.log(chalk.gray(`   仓库名: ${username}/${repoName}\n`));
        // 1. 获取 worktree 目录
        const workDir = execSync('git worktree list', { cwd: meta.gitDir, encoding: 'utf-8' })
            .split('\n')
            .find(line => line.includes(name))
            ?.split(' ')[0];
        if (!workDir) {
            throw new Error('无法找到 worktree 目录');
        }
        // 2. 添加 remote
        const remoteUrl = getSshUrl(`${username}/${repoName}`);
        // 检查 remote 是否存在
        const remotes = execSync('git remote -v', { cwd: workDir, encoding: 'utf-8' });
        if (!remotes.includes('origin')) {
            execSync(`git remote add origin ${remoteUrl}`, { cwd: workDir, stdio: 'inherit' });
        }
        // 3. 创建 GitHub 仓库并推送
        console.log(chalk.gray('  → 创建 GitHub 仓库...'));
        createGitHubRepo(repoName, `OpenClaw Agent: ${name}`);
        // 4. 推送
        console.log(chalk.gray('  → 推送到 GitHub...'));
        try {
            execSync('git push -u origin main', { cwd: workDir, stdio: 'inherit' });
        }
        catch {
            // 可能分支是 master
            execSync('git push -u origin master', { cwd: workDir, stdio: 'inherit' });
        }
        // 5. 更新元数据
        meta.remote = `${username}/${repoName}`;
        meta.lastSync = new Date().toISOString();
        setAgentMeta(name, meta);
        console.log(chalk.green(`\n✅ 发布完成！\n`));
        console.log(chalk.gray(`   仓库: https://github.com/${username}/${repoName}`));
        console.log(chalk.gray(`   克隆: git clone git@github.com:${username}/${repoName}.git\n`));
    }
    catch (error) {
        console.error(chalk.red(`\n❌ 错误: ${error.message}\n`));
        process.exit(1);
    }
});
//# sourceMappingURL=publish.js.map