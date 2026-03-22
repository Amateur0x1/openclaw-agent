import { Command } from 'commander';
import chalk from 'chalk';
import { getAgentMeta, removeAgentMeta } from '../lib/store.js';

export const untrackCommand = new Command('untrack')
  .description('Remove agent from Git version control (does not delete GitHub repo or OpenClaw config)')
  .argument('<name>', 'Agent name')
  .option('--keep-files', 'Keep local Git repo files')
  .action(async (name: string, options: any) => {
    try {
      const meta = getAgentMeta(name);
      if (!meta) {
        throw new Error(`Agent not found: ${name}`);
      }

      console.log(chalk.blue(`\n🗑️  Untracking agent: ${name}\n`));

      // 1. Delete local Git repo files (optional)
      if (!options.keepFiles) {
        console.log(chalk.gray('  → Removing local Git repo...'));
        const { rmSync } = await import('fs');
        try {
          rmSync(meta.gitDir, { recursive: true, force: true });
        } catch { }
      } else {
        console.log(chalk.gray('  → Keeping local Git repo files'));
      }

      // 2. Remove metadata
      console.log(chalk.gray('  → Removing from openclaw-agent management...'));
      removeAgentMeta(name);

      console.log(chalk.green(`\n✅ Agent "${name}" untracked\n`));
      console.log(chalk.gray(`   OpenClaw config: ${chalk.yellow('Not modified')}`));
      console.log(chalk.gray(`   GitHub repo: ${meta.remote || '(none)'}\n`));

    } catch (error: any) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  });
