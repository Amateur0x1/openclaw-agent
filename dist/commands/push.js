import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { getAgentMeta, setAgentMeta } from '../lib/store.js';
import { syncFromOpenclaw } from '../lib/git.js';
export const pushCommand = new Command('push')
    .description('Push agent to remote (auto-commits first if there are changes)')
    .argument('<name>', 'Agent name')
    .action(async (name) => {
    try {
        const meta = getAgentMeta(name);
        if (!meta) {
            throw new Error(`Agent not found: ${name}`);
        }
        console.log(chalk.blue(`\n⬆️  Pushing ${name} to remote\n`));
        const gitDir = meta.gitDir;
        // 1. Sync OpenClaw directory to repo
        console.log(chalk.gray('  → Syncing files to repo...'));
        syncFromOpenclaw(gitDir, name);
        // 2. Git add only the synced files (persona + skills)
        const workspace = `workspace-${name}`;
        execSync(`git add ${workspace}/IDENTITY.md ${workspace}/SOUL.md ${workspace}/TOOLS.md ${workspace}/skills/ 2>/dev/null || true`, { cwd: gitDir });
        try {
            execSync('git commit -m "update"', { cwd: gitDir });
        }
        catch {
            console.log(chalk.yellow('  ⚠️  No changes to commit'));
        }
        // 3. Check if git remote exists
        const remotes = execSync('git remote -v', { cwd: gitDir, encoding: 'utf-8' }).toString();
        if (!remotes.includes('origin')) {
            console.log(chalk.yellow('  ⚠️  No remote configured. Use publish to create one'));
            console.log(chalk.green(`\n✅ Done!\n`));
            return;
        }
        // 4. Push
        console.log(chalk.gray('  → Pushing to remote...'));
        try {
            execSync('git push origin main', { cwd: gitDir, stdio: 'inherit', shell: '/bin/bash' });
        }
        catch {
            // Fallback to master branch
            execSync('git push origin master', { cwd: gitDir, stdio: 'inherit', shell: '/bin/bash' });
        }
        // 5. Update metadata remote if not set
        if (!meta.remote) {
            const remoteUrl = execSync('git remote get-url origin', { cwd: gitDir, encoding: 'utf-8' }).toString().trim();
            const match = remoteUrl.match(/github\.com[:/](.+?)(?:\.git)?$/);
            if (match) {
                meta.remote = match[1];
                setAgentMeta(name, meta);
            }
        }
        console.log(chalk.green(`\n✅ Done!\n`));
    }
    catch (error) {
        console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
        process.exit(1);
    }
});
//# sourceMappingURL=push.js.map