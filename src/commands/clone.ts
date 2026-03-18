import { Command } from 'commander';
import chalk from 'chalk';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { getReposDir, setAgentMeta, getAgentMeta } from '../lib/store.js';
import { cloneGitHubRepo, getGhUsername } from '../lib/github.js';

export const cloneCommand = new Command('clone')
  .description('从 GitHub 克隆 agent 仓库并准备管理')
  .argument('<repo>', 'GitHub 仓库（如: username/repo 或完整 URL）')
  .option('-n, --name <name>', '指定 agent 名称（默认从仓库名提取）')
  .action(async (repo: string, options: any) => {
    try {
      // 解析仓库名
      let fullName = repo;
      if (!repo.includes('/')) {
        // 没有用户名，用当前 gh 用户
        const username = getGhUsername();
        fullName = `${username}/${repo}`;
      }

      const [owner, repoName] = fullName.split('/');
      const agentName = options.name || repoName;

      // 检查是否已管理
      if (getAgentMeta(agentName)) {
        throw new Error(`agent "${agentName}" 已在管理中`);
      }

      const reposDir = getReposDir();
      const workDir = join(reposDir, agentName);

      console.log(chalk.blue(`\n📦 克隆 agent: ${fullName}\n`));
      console.log(`  → Agent 名称: ${agentName}`);
      console.log(`  → 目标目录: ${workDir}\n`);

      // 1. 克隆仓库
      if (existsSync(workDir)) {
        console.log(chalk.yellow('⚠️  目录已存在，先删除...'));
        const { rmSync } = await import('fs');
        rmSync(workDir, { recursive: true, force: true });
      }

      console.log(chalk.gray('  → 克隆仓库...'));
      execSync(`git clone git@github.com:${fullName}.git "${workDir}"`, { stdio: 'inherit' });

      // 2. 读取 config.json
      const configPath = join(workDir, 'config.json');
      let config: any = { id: agentName };
      if (existsSync(configPath)) {
        config = JSON.parse(readFileSync(configPath, 'utf-8'));
      }

      // 3. 同步到 OpenClaw 目录
      console.log(chalk.gray('  → 同步到 OpenClaw...'));
      const OC_HOME = homedir();
      const workspaceDir = join(OC_HOME, `.openclaw/workspace-${agentName}`);
      const agentDir = join(OC_HOME, `.openclaw/agents/${agentName}`);

      // 同步 workspace
      const srcWorkspace = join(workDir, `workspace-${agentName}`);
      if (existsSync(srcWorkspace)) {
        mkdirSync(workspaceDir, { recursive: true });
        execSync(`cp -r "${srcWorkspace}/"* "${workspaceDir}/" 2>/dev/null || true`, { shell: '/bin/bash' });
        console.log(`  ✓ 已同步 workspace`);
      }

      // 同步 agent
      const srcAgent = join(workDir, agentName);
      if (existsSync(srcAgent)) {
        mkdirSync(agentDir, { recursive: true });
        execSync(`cp -r "${srcAgent}/"* "${agentDir}/" 2>/dev/null || true`, { shell: '/bin/bash' });
        console.log(`  ✓ 已同步 agent`);
      }

      // 4. 保存元数据
      setAgentMeta(agentName, {
        name: agentName,
        workspace: workspaceDir,
        gitDir: workDir,
        agentDir: agentDir,
        config: config,
        remote: fullName,
        lastSync: new Date().toISOString()
      });

      // 用 config.json 中的 id 作为 import 的名称
      const importName = config?.id || agentName;
      console.log(chalk.green(`\n✅ 克隆完成！\n`));
      console.log(chalk.gray(`   运行 ${chalk.blue('openclaw-agent import ' + importName)} 导入到 OpenClaw\n`));

    } catch (error: any) {
      console.error(chalk.red(`\n❌ 错误: ${error.message}\n`));
      process.exit(1);
    }
  });
