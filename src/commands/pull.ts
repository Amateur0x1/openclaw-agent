import { Command } from 'commander';
import chalk from 'chalk';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { getReposDir, setAgentMeta, getAgentMeta } from '../lib/store.js';
import { syncToOpenclaw } from '../lib/git.js';
import { getOpenclawAgent, registerAgent } from '../lib/openclaw.js';

function ensureNativeOpenclawAgent(agentName: string, workspacePath: string, config: any): void {
  const existingAgent = getOpenclawAgent(agentName);
  if (!existingAgent) {
    console.log(chalk.gray('  → Adding agent via openclaw agents add...'));
    const model = config?.model?.primary || config?.model;
    const modelFlag = model ? ` --model "${model}"` : '';
    execSync(
      `openclaw agents add ${agentName} --workspace "${workspacePath}" --non-interactive${modelFlag}`,
      { stdio: 'inherit', shell: '/bin/bash' }
    );
  }

  // Merge repo config back into openclaw.json while preserving fields that
  // OpenClaw initialized through the native command.
  registerAgent({
    id: agentName,
    workspace: workspacePath,
    model: config?.model,
    subagents: config?.subagents,
    skills: config?.skills || [],
    identity: config?.identity
  });
}

export const pullCommand = new Command('pull')
  .description('Pull agent from remote and sync to OpenClaw (clones if not already managed)')
  .argument('<name>', 'Agent name or repo (owner/repo)')
  .action(async (name: string) => {
    try {
      const OC_HOME = homedir();

      // Resolve repo name (handle owner/repo format)
      let agentName = name;
      let repoName = name;
      if (name.includes('/')) {
        [, agentName] = name.split('/');
        repoName = name;
      }

      const reposDir = getReposDir();
      const workDir = join(reposDir, agentName);
      const meta = getAgentMeta(agentName);

      // If not yet managed, clone from remote first
      if (!meta) {
        console.log(chalk.blue(`\n📦 Agent "${agentName}" not yet tracked — cloning from remote\n`));

        if (existsSync(workDir)) {
          const { rmSync } = await import('fs');
          rmSync(workDir, { recursive: true, force: true });
        }

        // Try to clone (assume git@github.com:owner/repo.git)
        const fullRepo = repoName.includes('/') ? repoName : `${repoName}/${agentName}`;
        console.log(chalk.gray(`  → Cloning git@github.com:${fullRepo}.git ...`));
        execSync(`git clone git@github.com:${fullRepo}.git "${workDir}"`, { stdio: 'inherit' });

        // Read config.json
        const configPath = join(workDir, 'config.json');
        let config: any = { id: agentName };
        if (existsSync(configPath)) {
          config = JSON.parse(readFileSync(configPath, 'utf-8'));
        }

        // Ensure the agent is created via the native OpenClaw flow first.
        const workspacePath = join(OC_HOME, `.openclaw/workspace-${agentName}`);
        ensureNativeOpenclawAgent(agentName, workspacePath, config);

        // Sync workspace files
        console.log(chalk.gray('  → Syncing workspace files...'));
        syncToOpenclaw(workDir, agentName);

        // Save metadata
        setAgentMeta(agentName, {
          name: agentName,
          workspace: workspacePath,
          gitDir: workDir,
          agentDir: join(OC_HOME, `.openclaw/agents/${agentName}`),
          config: config,
          remote: fullRepo,
          lastSync: new Date().toISOString()
        });

        console.log(chalk.green(`\n✅ Done! Agent "${agentName}" cloned and imported\n`));
        return;
      }

      // Already managed — pull + sync
      console.log(chalk.blue(`\n⬇️  Pulling "${agentName}" from remote\n`));

      if (!meta.remote) {
        throw new Error(`Agent "${agentName}" has no remote configured. Use publish first`);
      }

      // Pull (try main first, fallback to master)
      console.log(chalk.gray('  → Pulling from remote...'));
      try {
        execSync('git fetch origin', { cwd: meta.gitDir, stdio: 'inherit' });
        execSync('git pull origin main', { cwd: meta.gitDir, stdio: 'inherit' });
      } catch {
        console.log(chalk.gray('  → Falling back to master branch...'));
        execSync('git pull origin master', { cwd: meta.gitDir, stdio: 'inherit' });
      }

      // Sync to OpenClaw workspace
      console.log(chalk.gray('  → Syncing to OpenClaw...'));
      syncToOpenclaw(meta.gitDir, agentName);

      meta.lastSync = new Date().toISOString();
      setAgentMeta(agentName, meta);

      console.log(chalk.green(`\n✅ Done!\n`));

    } catch (error: any) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  });
