import { Command } from 'commander';
import chalk from 'chalk';
import { getAgentMeta, removeAgentMeta } from '../lib/store.js';

export const untrackCommand = new Command('untrack')
  .description('取消 agent 的 Git 版本控制（不删除 GitHub 仓库和 OpenClaw 配置）')
  .argument('<name>', 'Agent 名称')
  .option('--keep-files', '保留本地 Git 仓库文件')
  .action(async (name: string, options: any) => {
    try {
      const meta = getAgentMeta(name);
      if (!meta) {
        throw new Error(`未找到 agent: ${name}`);
      }
      
      console.log(chalk.blue(`\n🗑️  移除 agent: ${name}\n`));
      
      // 1. 删除本地 Git 仓库文件（可选）
      if (!options.keepFiles) {
        console.log(chalk.gray('  → 删除本地 Git 仓库...'));
        const { rmSync } = await import('fs');
        try {
          rmSync(meta.gitDir, { recursive: true, force: true });
        } catch {}
      } else {
        console.log(chalk.gray('  → 保留本地 Git 仓库'));
      }
      
      // 2. 删除元数据（只管理 ~/.openclaw-agents/）
      console.log(chalk.gray('  → 从 openclaw-agent 管理中移除...'));
      removeAgentMeta(name);
      
      console.log(chalk.green(`\n✅ 已移除 agent "${name}" 管理\n`));
      console.log(chalk.gray(`   OpenClaw 配置: ${chalk.yellow('未改动')}`));
      console.log(chalk.gray(`   GitHub 仓库: ${meta.remote || '(无)'}\n`));
      
    } catch (error: any) {
      console.error(chalk.red(`\n❌ 错误: ${error.message}\n`));
      process.exit(1);
    }
  });
