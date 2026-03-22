import { Command } from 'commander';
import chalk from 'chalk';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { getAgentMeta } from '../lib/store.js';
import { getOpenclawConfig, registerAgent } from '../lib/openclaw.js';
import { syncToOpenclaw } from '../lib/git.js';

export const importCommand = new Command('import')
  .description('Import a tracked agent into OpenClaw (registers the config)')
  .argument('<name>', 'Tracked agent name')
  .action(async (name: string, options: any) => {
    try {
      const meta = getAgentMeta(name);
      if (!meta) {
        throw new Error(`Agent not found: ${name}. Run track or clone first`);
      }

      console.log(chalk.blue(`\n📥 Importing agent: ${name}\n`));

      // 1. Read config.json
      const configPath = join(meta.gitDir, 'config.json');
      if (!existsSync(configPath)) {
        throw new Error('config.json not found. Make sure the agent has been tracked');
      }
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));

      // 2. Check if agent already exists in openclaw.json
      const ocConfig = getOpenclawConfig();
      const existingAgent = ocConfig?.agents?.list?.find((a: any) => a.id === name);

      let workspacePath: string;

      if (existingAgent?.workspace) {
        // Already exists, read workspace path directly
        console.log(chalk.gray('  → Agent already exists, reading workspace path'));
        workspacePath = existingAgent.workspace.replace('~', homedir());
      } else {
        // Doesn't exist, call openclaw agents add (interactive)
        console.log(chalk.gray('  → Calling openclaw agents add...'));
        console.log(chalk.gray(`   (Please fill in workspace in the interactive prompt, agent id is pre-filled: ${name})`));

        execSync(`openclaw agents add ${name}`, {
          stdio: 'inherit',
          shell: '/bin/bash'
        });

        // Re-read config to get workspace path
        const newOcConfig = getOpenclawConfig();
        const newAgent = newOcConfig?.agents?.list?.find((a: any) => a.id === name);

        if (!newAgent?.workspace) {
          throw new Error('openclaw agents add failed to set workspace correctly');
        }

        workspacePath = newAgent.workspace.replace('~', homedir());
      }

      console.log(`  → Workspace: ${workspacePath}`);

      // 3. Sync workspace files (Git → OpenClaw)
      console.log(chalk.gray('  → Syncing workspace files...'));
      syncToOpenclaw(meta.gitDir, name);

      // 4. Update skills config in openclaw.json
      if (config.skills && Array.isArray(config.skills) && config.skills.length > 0) {
        console.log(chalk.gray('  → Updating agent skills config...'));
        registerAgent({
          id: name,
          skills: config.skills,
        });
      }

      console.log(chalk.green(`\n✅ Import complete!\n`));

    } catch (error: any) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  });
