import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { getAgentMeta, setAgentMeta } from '../lib/store.js';
import { getGhUsername, createGitHubRepo, getSshUrl } from '../lib/github.js';
export const publishCommand = new Command('publish')
    .description('发布 agent 到 GitHub')
    .argument('<name>', 'Agent 名称')
    .option('-r, --repo <name>', 'GitHub 仓库名称（默认与 agent id 相同）')
    .action(async (name, options) => {
    try {
        const meta = getAgentMeta(name);
        if (!meta) {
            throw new Error(`未找到 agent: ${name}`);
        }
        const gitDir = meta.gitDir;
        // 检查 git remote 是否已存在
        const remotes = execSync('git remote -v', { cwd: gitDir, encoding: 'utf-8' }).toString();
        if (remotes.includes('origin')) {
            // 已存在 remote，从 URL 解析 repo 名
            const remoteUrl = execSync('git remote get-url origin', { cwd: gitDir, encoding: 'utf-8' }).toString().trim();
            const match = remoteUrl.match(/github\.com[:/](.+?)(?:\.git)?$/);
            const existingRepo = match ? match[1] : null;
            console.log(chalk.yellow(`⚠️  Agent "${name}" 已有远程仓库: ${existingRepo}`));
            console.log(chalk.gray('   使用 push 命令推送更新\n'));
            return;
        }
        // 使用 config.json 中的 id 作为默认仓库名
        const agentId = meta.config?.id || name;
        const repoName = options.repo || agentId;
        const username = getGhUsername();
        console.log(chalk.blue(`\n🚀 发布 ${name} 到 GitHub\n`));
        console.log(chalk.gray(`   仓库名: ${username}/${repoName}\n`));
        // 1. 添加 remote
        const remoteUrl = getSshUrl(`${username}/${repoName}`);
        execSync(`git remote add origin ${remoteUrl}`, { cwd: gitDir, stdio: 'inherit' });
        // 2. 创建 GitHub 仓库
        console.log(chalk.gray('  → 创建 GitHub 仓库...'));
        try {
            createGitHubRepo(repoName, `OpenClaw Agent: ${name}`);
        }
        catch (e) {
            if (e.message.includes('already exists')) {
                console.log(chalk.gray('   仓库已存在，跳过创建'));
            }
            else {
                throw e;
            }
        }
        // 3. 推送
        console.log(chalk.gray('  → 推送到 GitHub...'));
        try {
            execSync('git push -u origin main', { cwd: gitDir, stdio: 'inherit' });
        }
        catch {
            // 可能分支是 master
            execSync('git push -u origin master', { cwd: gitDir, stdio: 'inherit' });
        }
        // 4. 更新元数据
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