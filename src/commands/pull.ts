import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { getAgentMeta, setAgentMeta } from '../lib/store.js';
import { syncToOpenclaw } from '../lib/git.js';

export const pullCommand = new Command('pull')
  .description('Pull agent changes from remote (Git repo only, no import)')
  .argument('<name>', 'Agent name')
  .action(async (name: string) => {
    try {
      const meta = getAgentMeta(name);
      if (!meta) {
        throw new Error(`Agent not found: ${name}`);
      }

      console.log(chalk.blue(`\n⬇️  Pulling ${name} from remote\n`));

      const gitDir = meta.gitDir;

      // 1. Pull
      if (meta.remote) {
        console.log(chalk.gray('  → Pulling from remote...'));
        execSync('git pull origin main', { cwd: gitDir, stdio: 'inherit', shell: '/bin/bash' });
      } else {
        throw new Error('No remote configured. Use publish first');
      }

      // 2. Sync to OpenClaw directory
      console.log(chalk.gray('  → Syncing to OpenClaw...'));
      syncToOpenclaw(gitDir, name);

      meta.lastSync = new Date().toISOString();
      setAgentMeta(name, meta);

      console.log(chalk.green(`\n✅ Done!\n`));

    } catch (error: any) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  });
