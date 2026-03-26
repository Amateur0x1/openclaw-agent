import { Command } from 'commander';
import chalk from 'chalk';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { getReposDir, setAgentMeta, getAgentMeta } from '../lib/store.js';
import { syncToOpenclaw } from '../lib/git.js';
import { getOpenclawConfig, registerAgent } from '../lib/openclaw.js';
export const pullCommand = new Command('pull')
    .description('Pull agent from remote and sync to OpenClaw (clones if not already managed)')
    .argument('<name>', 'Agent name or repo (owner/repo)')
    .action(async (name) => {
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
            let config = { id: agentName };
            if (existsSync(configPath)) {
                config = JSON.parse(readFileSync(configPath, 'utf-8'));
            }
            // Register agent in openclaw.json if not already present
            const ocConfig = getOpenclawConfig();
            const existingAgent = ocConfig?.agents?.list?.find((a) => a.id === agentName);
            if (!existingAgent) {
                console.log(chalk.gray('  → Registering agent in openclaw.json...'));
                registerAgent({ id: agentName, skills: config.skills || [] });
            }
            // Determine workspace path
            const ocConfig2 = getOpenclawConfig();
            const ocAgent = ocConfig2?.agents?.list?.find((a) => a.id === agentName);
            let workspacePath = ocAgent?.workspace?.replace('~', OC_HOME) || join(OC_HOME, `.openclaw/workspace-${agentName}`);
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
        }
        catch {
            console.log(chalk.gray('  → Falling back to master branch...'));
            execSync('git pull origin master', { cwd: meta.gitDir, stdio: 'inherit' });
        }
        // Sync to OpenClaw workspace
        console.log(chalk.gray('  → Syncing to OpenClaw...'));
        syncToOpenclaw(meta.gitDir, agentName);
        meta.lastSync = new Date().toISOString();
        setAgentMeta(agentName, meta);
        console.log(chalk.green(`\n✅ Done!\n`));
    }
    catch (error) {
        console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
        process.exit(1);
    }
});
//# sourceMappingURL=pull.js.map