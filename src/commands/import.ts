import { Command } from 'commander';
import chalk from 'chalk';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, cpSync } from 'fs';
import { execSync } from 'child_process';
import { getReposDir, setAgentMeta } from '../lib/store.js';
import { loadAgentConfig } from '../lib/config.js';
import { getSshUrl, isGhInstalled, isGhAuthenticated, getGhUsername } from '../lib/github.js';

export const importCommand = new Command('import')
  .description('从 GitHub 仓库导入 agent')
  .argument('<repo>', 'GitHub 仓库 (owner/repo 或 URL)')
  .option('-n, --name <name>', '指定 agent 名称（默认使用仓库名）')
  .action(async (repo: string, options: any) => {
    try {
      // 解析仓库名
      let fullName = repo;
      if (!repo.includes('/')) {
        // 只有仓库名，加上当前用户名
        if (!isGhInstalled() || !isGhAuthenticated()) {
          throw new Error('需要指定完整仓库名 (owner/repo)');
        }
        const username = getGhUsername();
        fullName = `${username}/${repo}`;
      }
      
      const [owner, repoName] = fullName.split('/');
      const agentName = options.name || repoName.replace(/^openclaw-agent-/, '');
      
      console.log(chalk.blue(`\n📥 导入 agent: ${agentName}`));
      console.log(chalk.gray(`   仓库: ${fullName}\n`));
      
      const reposDir = getReposDir();
      const gitDir = join(reposDir, agentName);
      
      // 1. 克隆仓库（普通仓库）
      if (existsSync(gitDir)) {
        console.log(chalk.yellow('⚠️  仓库已存在，跳过克隆'));
      } else {
        console.log(chalk.gray('  → 克隆仓库...'));
        
        // 直接 clone
        execSync(`git clone "git@github.com:${fullName}.git" "${gitDir}"`, { 
          cwd: reposDir, 
          stdio: 'inherit',
          shell: '/bin/bash'
        });
      }
      
      // 2. 读取配置
      const config = loadAgentConfig(gitDir);
      if (!config) {
        throw new Error('仓库中未找到 config.json');
      }
      
      console.log(`  ✓ 配置: ${JSON.stringify(config)}`);
      
      // 3. 同步到 OpenClaw 目录
      console.log(chalk.gray('  → 同步到 OpenClaw...'));
      
      const OC_HOME = homedir();
      const workspacePath = join(OC_HOME, `.openclaw/workspace-${agentName}`);
      const agentDir = join(OC_HOME, `.openclaw/agents/${agentName}`);
      
      // 同步 workspace-{name}
      const srcWorkspace = join(gitDir, `workspace-${agentName}`);
      if (existsSync(srcWorkspace)) {
        mkdirSync(workspacePath, { recursive: true });
        execSync(`cp -r "${srcWorkspace}/"* "${workspacePath}/" 2>/dev/null || true`, { shell: '/bin/bash' });
        console.log(`  ✓ Workspace: ${workspacePath}`);
      } else {
        console.log(chalk.yellow(`  ⚠️  未找到 workspace-${agentName} 目录`));
      }
      
      // 同步 agent（同名的文件夹）
      const srcAgent = join(gitDir, agentName);
      if (existsSync(srcAgent)) {
        mkdirSync(agentDir, { recursive: true });
        execSync(`cp -r "${srcAgent}/"* "${agentDir}/" 2>/dev/null || true`, { shell: '/bin/bash' });
        console.log(`  ✓ Agent: ${agentDir}`);
      } else {
        console.log(chalk.yellow(`  ⚠️  未找到 ${agentName} 目录`));
      }
      
      // 4. 注册到 OpenClaw（使用 CLI，用 ~ 路径）
      console.log(chalk.gray('  → 注册到 OpenClaw...'));
      execSync(`openclaw agents add ${agentName} --workspace "~/.openclaw/workspace-${agentName}"`, { 
        stdio: 'inherit',
        shell: '/bin/bash'
      });
      
      // 5. 保存元数据
      setAgentMeta(agentName, {
        name: agentName,
        workspace: workspacePath,
        gitDir,
        agentDir,
        config,
        remote: fullName,
        lastSync: new Date().toISOString()
      });
      
      console.log(chalk.green(`\n✅ 完成！Agent "${agentName}" 已导入\n`));
      
    } catch (error: any) {
      console.error(chalk.red(`\n❌ 错误: ${error.message}\n`));
      process.exit(1);
    }
  });
