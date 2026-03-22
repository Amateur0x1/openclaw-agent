import { Command } from 'commander';
import chalk from 'chalk';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { getReposDir, setAgentMeta, getAgentMeta } from '../lib/store.js';
import { getGhUsername } from '../lib/github.js';
export const cloneCommand = new Command('clone')
    .description('Clone an agent repo from GitHub and start managing it')
    .argument('<repo>', 'GitHub repository (e.g. username/repo or full URL)')
    .option('-n, --name <name>', 'Specify agent name (default: extracted from repo name)')
    .action(async (repo, options) => {
    try {
        // Resolve full repo name
        let fullName = repo;
        if (!repo.includes('/')) {
            // No username given, use current gh user
            const username = getGhUsername();
            fullName = `${username}/${repo}`;
        }
        const [owner, repoName] = fullName.split('/');
        const agentName = options.name || repoName;
        // Check if already managed
        if (getAgentMeta(agentName)) {
            throw new Error(`Agent "${agentName}" is already being managed`);
        }
        const reposDir = getReposDir();
        const workDir = join(reposDir, agentName);
        console.log(chalk.blue(`\n📦 Cloning agent: ${fullName}\n`));
        console.log(`  → Agent name: ${agentName}`);
        console.log(`  → Target dir: ${workDir}\n`);
        // 1. Clone repo
        if (existsSync(workDir)) {
            console.log(chalk.yellow('⚠️  Directory already exists, removing...'));
            const { rmSync } = await import('fs');
            rmSync(workDir, { recursive: true, force: true });
        }
        console.log(chalk.gray('  → Cloning repo...'));
        execSync(`git clone git@github.com:${fullName}.git "${workDir}"`, { stdio: 'inherit' });
        // 2. Read config.json
        const configPath = join(workDir, 'config.json');
        let config = { id: agentName };
        if (existsSync(configPath)) {
            config = JSON.parse(readFileSync(configPath, 'utf-8'));
        }
        // 3. Sync to OpenClaw directory
        console.log(chalk.gray('  → Syncing to OpenClaw...'));
        const OC_HOME = homedir();
        const workspaceDir = join(OC_HOME, `.openclaw/workspace-${agentName}`);
        const agentDir = join(OC_HOME, `.openclaw/agents/${agentName}`);
        // Sync workspace
        const srcWorkspace = join(workDir, `workspace-${agentName}`);
        if (existsSync(srcWorkspace)) {
            mkdirSync(workspaceDir, { recursive: true });
            execSync(`cp -r "${srcWorkspace}/"* "${workspaceDir}/" 2>/dev/null || true`, { shell: '/bin/bash' });
            console.log(`  ✓ Synced workspace`);
        }
        // Sync agent directory
        const srcAgent = join(workDir, agentName);
        if (existsSync(srcAgent)) {
            mkdirSync(agentDir, { recursive: true });
            execSync(`cp -r "${srcAgent}/"* "${agentDir}/" 2>/dev/null || true`, { shell: '/bin/bash' });
            console.log(`  ✓ Synced agent`);
        }
        // 4. Save metadata
        setAgentMeta(agentName, {
            name: agentName,
            workspace: workspaceDir,
            gitDir: workDir,
            agentDir: agentDir,
            config: config,
            remote: fullName,
            lastSync: new Date().toISOString()
        });
        // Use id from config.json as the name for import
        const importName = config?.id || agentName;
        console.log(chalk.green(`\n✅ Clone complete!\n`));
        console.log(chalk.gray(`   Run ${chalk.blue('openclaw-agent import ' + importName)} to import into OpenClaw\n`));
    }
    catch (error) {
        console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
        process.exit(1);
    }
});
//# sourceMappingURL=clone.js.map