import { Command } from 'commander';
import chalk from 'chalk';
import { execSync } from 'child_process';
import { getAgentMeta, setAgentMeta } from '../lib/store.js';
import { getGhUsername, createGitHubRepo, getSshUrl } from '../lib/github.js';

export const publishCommand = new Command('publish')
  .description('Publish an agent to GitHub (creates a new repo and pushes)')
  .argument('<name>', 'Agent name')
  .option('-r, --repo <name>', 'GitHub repo name (default: same as agent id)')
  .action(async (name: string, options: any) => {
    try {
      const meta = getAgentMeta(name);
      if (!meta) {
        throw new Error(`Agent not found: ${name}`);
      }

      const gitDir = meta.gitDir;

      // Check if git remote already exists
      const remotes = execSync('git remote -v', { cwd: gitDir, encoding: 'utf-8' }).toString();
      if (remotes.includes('origin')) {
        const remoteUrl = execSync('git remote get-url origin', { cwd: gitDir, encoding: 'utf-8' }).toString().trim();
        const match = remoteUrl.match(/github\.com[:/](.+?)(?:\.git)?$/);
        const existingRepo = match ? match[1] : null;
        console.log(chalk.yellow(`⚠️  Agent "${name}" already has a remote: ${existingRepo}`));
        console.log(chalk.gray('   Use push to push updates\n'));
        return;
      }

      // Use id from config.json as default repo name
      const agentId = meta.config?.id || name;
      const repoName = options.repo || agentId;
      const username = getGhUsername();

      console.log(chalk.blue(`\n🚀 Publishing ${name} to GitHub\n`));
      console.log(chalk.gray(`   Repo: ${username}/${repoName}\n`));

      // 1. Add remote
      const remoteUrl = getSshUrl(`${username}/${repoName}`);
      execSync(`git remote add origin ${remoteUrl}`, { cwd: gitDir, stdio: 'inherit' });

      // 2. Create GitHub repo
      console.log(chalk.gray('  → Creating GitHub repo...'));
      try {
        createGitHubRepo(repoName, `OpenClaw Agent: ${name}`);
      } catch (e: any) {
        if (e.message.includes('already exists')) {
          console.log(chalk.gray('   Repo already exists, skipping creation'));
        } else {
          throw e;
        }
      }

      // 3. Push
      console.log(chalk.gray('  → Pushing to GitHub...'));
      try {
        execSync('git push -u origin main', { cwd: gitDir, stdio: 'inherit' });
      } catch {
        // Fallback to master branch
        execSync('git push -u origin master', { cwd: gitDir, stdio: 'inherit' });
      }

      // 4. Update metadata
      meta.remote = `${username}/${repoName}`;
      meta.lastSync = new Date().toISOString();
      setAgentMeta(name, meta);

      console.log(chalk.green(`\n✅ Publish complete!\n`));
      console.log(chalk.gray(`   Repo: https://github.com/${username}/${repoName}`));
      console.log(chalk.gray(`   Clone: git clone git@github.com:${username}/${repoName}.git\n`));

    } catch (error: any) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  });
