import { Command } from 'commander';
import chalk from 'chalk';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { getAgentMeta, setAgentMeta } from '../lib/store.js';
import { getOpenclawConfig } from '../lib/openclaw.js';
import { syncToOpenclaw } from '../lib/git.js';

export const syncCommand = new Command('sync')
  .description('Sync agent: pull from remote and import into OpenClaw')
  .argument('<name>', 'Agent name')
  .option('--no-import', 'Pull changes without importing into OpenClaw')
  .action(async (name: string, options: any) => {
    try {
      const meta = getAgentMeta(name);
      if (!meta) {
        throw new Error(`Agent not found: ${name}`);
      }

      if (!meta.remote) {
        throw new Error(`Agent "${name}" has no remote configured. Run publish first`);
      }

      console.log(chalk.blue(`\n🔄 Syncing agent: ${name}\n`));

      const workDir = meta.gitDir;

      // 1. Fetch and pull remote changes
      console.log(chalk.gray('  → Fetching and pulling remote changes...'));
      try {
        execSync('git fetch origin', { cwd: workDir, stdio: 'inherit' });
        execSync('git pull origin main', { cwd: workDir, stdio: 'inherit' });
      } catch {
        // Fallback to master branch
        execSync('git pull origin master', { cwd: workDir, stdio: 'inherit' });
      }

      // 2. Skip import if --no-import
      if (options.import === false) {
        console.log(chalk.yellow('  ⚠️  Pulled changes, but skipping import\n'));
        return;
      }

      // 3. Check if agent already exists in openclaw.json
      const ocConfig = getOpenclawConfig();
      const existingAgent = ocConfig?.agents?.list?.find((a: any) => a.id === name);

      let workspacePath: string;

      if (existingAgent?.workspace) {
        workspacePath = existingAgent.workspace.replace('~', homedir());
      } else {
        console.log(chalk.gray('  → Calling openclaw agents add...'));
        console.log(chalk.gray(`   (Please fill in workspace in the interactive prompt, agent id is pre-filled: ${name})`));

        execSync(`openclaw agents add ${name}`, {
          stdio: 'inherit',
          shell: '/bin/bash'
        });

        const newOcConfig = getOpenclawConfig();
        const newAgent = newOcConfig?.agents?.list?.find((a: any) => a.id === name);

        if (!newAgent?.workspace) {
          throw new Error('openclaw agents add failed to set workspace correctly');
        }

        workspacePath = newAgent.workspace.replace('~', homedir());
      }

      console.log(`  → Workspace: ${workspacePath}`);

      // 4. Sync workspace files (Git → OpenClaw)
      console.log(chalk.gray('  → Syncing workspace files...'));
      syncToOpenclaw(workDir, name);

      // 5. Update metadata
      meta.lastSync = new Date().toISOString();
      setAgentMeta(name, meta);

      console.log(chalk.green(`\n✅ Sync complete!\n`));

    } catch (error: any) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  });
