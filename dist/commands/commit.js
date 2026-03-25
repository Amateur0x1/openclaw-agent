import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { getAgentMeta } from '../lib/store.js';
import { syncFromOpenclaw } from '../lib/git.js';
export const commitCommand = new Command('commit')
    .description('Commit agent changes to the local Git repository')
    .argument('<name>', 'Agent name')
    .argument('[message]', 'Commit message')
    .action(async (name, message) => {
    try {
        const meta = getAgentMeta(name);
        if (!meta) {
            throw new Error(`Agent not found: ${name}`);
        }
        console.log(chalk.blue(`\n📝 Committing agent: ${name}\n`));
        console.log(`   Message: ${message}\n`);
        const gitDir = meta.gitDir;
        // 1. Sync OpenClaw directory to repo
        console.log(chalk.gray('  → Syncing files to repo...'));
        syncFromOpenclaw(gitDir, name);
        // 2. Git add only the synced files (persona + skills)
        console.log(chalk.gray('  → Committing to Git...'));
        const workspace = `workspace-${name}`;
        execSync(`git add ${workspace}/AGENTS.md ${workspace}/IDENTITY.md ${workspace}/SOUL.md ${workspace}/TOOLS.md ${workspace}/skills/ 2>/dev/null || true`, { cwd: gitDir });
        try {
            execSync(`git commit -m "${message}"`, { cwd: gitDir });
            console.log(chalk.green(`  ✓ Committed\n`));
        }
        catch {
            console.log(chalk.yellow('  ⚠️  No changes to commit\n'));
        }
        if (meta.remote) {
            console.log(chalk.gray(`   Run ${chalk.blue('openclaw-agent push ' + name)} to push to remote\n`));
        }
        else {
            console.log(chalk.yellow('  ⚠️  No remote set. Use publish to create one\n'));
        }
    }
    catch (error) {
        console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
        process.exit(1);
    }
});
//# sourceMappingURL=commit.js.map