import { Command } from 'commander';
import chalk from 'chalk';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, cpSync, writeFileSync, readFileSync, rmSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { getReposDir, setAgentMeta, getAgentMeta } from '../lib/store.js';
import { getGhUsername, createGitHubRepo, getSshUrl } from '../lib/github.js';
import { syncFromOpenclaw } from '../lib/git.js';
import { getOpenclawConfig } from '../lib/openclaw.js';

function exec(cmd: string, cwd: string, ignoreError = false): void {
  try {
    execSync(cmd, { cwd, stdio: 'inherit', shell: '/bin/bash' });
  } catch (e: any) {
    if (!ignoreError) throw new Error(`Command failed: ${cmd}\n${e.message}`);
  }
}

/**
 * Initialize a new git repo for an agent (same logic as track first-time)
 */
function initAgentRepo(agentName: string, workspacePath: string, workDir: string, ocConfig: any, ocAgent: any): void {
  const OC_HOME = homedir();
  const workWorkspace = join(workDir, `workspace-${agentName}`);

  const ocSkillsDirs: string[] = ocConfig?.skills?.load?.extraDirs ?? [];
  const allSkillsRoots = [
    join(OC_HOME, '.openclaw', 'skills'),
    join(OC_HOME, '.openclaw', 'workspace', 'skills'),
    join(workspacePath, 'skills'),
    ...ocSkillsDirs,
  ];

  function findSkillByName(skillName: string): string | null {
    for (const root of allSkillsRoots) {
      const skillPath = join(root, skillName);
      if (existsSync(skillPath)) return skillPath;
    }
    return null;
  }

  function resolveSkillEntry(entry: string): { name: string; path: string } | null {
    if (entry.includes('/')) {
      const name = entry.split('/').pop()!;
      return existsSync(entry) ? { name, path: entry } : null;
    } else {
      const path = findSkillByName(entry);
      return path ? { name: entry, path } : null;
    }
  }

  // Collect skills
  const skillsToSync: string[] = [];
  if (ocAgent?.skills && Array.isArray(ocAgent.skills)) {
    for (const skillEntry of ocAgent.skills) {
      const resolved = resolveSkillEntry(skillEntry);
      if (!resolved) continue;
      skillsToSync.push(resolved.name);
    }
  }

  // Auto-discover skills
  const discoveredSkills = new Set<string>();
  for (const root of allSkillsRoots) {
    if (!existsSync(root)) continue;
    try {
      for (const entry of readdirSync(root)) {
        const skillPath = join(root, entry);
        if (!existsSync(skillPath) || skillsToSync.includes(entry) || discoveredSkills.has(entry)) continue;
        if (existsSync(join(skillPath, 'SKILL.md')) || existsSync(join(skillPath, 'skill.md'))) {
          discoveredSkills.add(entry);
        }
      }
    } catch {}
  }

  for (const s of discoveredSkills) skillsToSync.push(s);

  // Copy persona files
  mkdirSync(workWorkspace, { recursive: true });
  const personaFiles = ['IDENTITY.md', 'SOUL.md', 'README.md', 'README_zh.md'];
  for (const file of personaFiles) {
    const src = join(workspacePath, file);
    if (existsSync(src)) cpSync(src, join(workWorkspace, file));
  }

  // Copy .gitignore
  const templateGitignore = join(import.meta.dirname, '../../templates/default/workspace/.gitignore');
  if (existsSync(templateGitignore)) cpSync(templateGitignore, join(workWorkspace, '.gitignore'));

  // Copy skills
  const destSkillsDir = join(workWorkspace, 'skills');
  if (skillsToSync.length > 0) {
    mkdirSync(destSkillsDir, { recursive: true });
    for (const skillName of skillsToSync) {
      const resolved = resolveSkillEntry(skillName);
      if (!resolved) continue;
      const destSkillDir = join(destSkillsDir, skillName);
      mkdirSync(destSkillDir, { recursive: true });
      exec(`cp -r "${resolved.path}/." "${destSkillDir}/" 2>/dev/null || true`, workDir);
      exec(`find "${destSkillDir}" -name '.git' -exec rm -rf {} + 2>/dev/null || true`, workDir);
    }
  }

  // Create config.json
  let configJson: any = { id: agentName };
  if (ocAgent?.name) configJson.name = ocAgent.name;
  if (skillsToSync.length > 0) configJson.skills = skillsToSync;
  if (ocAgent?.identity) configJson.identity = ocAgent.identity;
  if (ocAgent?.subagents) configJson.subagents = ocAgent.subagents;
  if (ocAgent?.tools) configJson.tools = ocAgent.tools;
  writeFileSync(join(workDir, 'config.json'), JSON.stringify(configJson, null, 2));

  // Git init
  exec('git init', workDir);
  exec('git config user.email "agent@local"', workDir);
  exec('git config user.name "OpenClaw Agent"', workDir);
  exec('git add .', workDir);
  try { exec('git commit -m "init"', workDir); } catch {}

  // Save metadata
  setAgentMeta(agentName, {
    name: agentName,
    workspace: workspacePath,
    gitDir: workDir,
    agentDir: join(OC_HOME, `.openclaw/agents/${agentName}`),
    config: configJson,
    remote: null,
    lastSync: new Date().toISOString()
  });
}

export const publishCommand = new Command('publish')
  .description('Publish an agent to GitHub (auto-initializes if not managed, creator only)')
  .argument('<name>', 'Agent name')
  .option('-r, --repo <name>', 'GitHub repo name (default: same as agent id)')
  .action(async (name: string, options: any) => {
    try {
      const OC_HOME = homedir();
      const reposDir = getReposDir();
      let meta = getAgentMeta(name);

      // Auto-initialize if not yet tracked
      if (!meta) {
        console.log(chalk.blue(`\n🚀 Agent "${name}" not yet tracked — initializing first\n`));

        const workspacePath = join(OC_HOME, `.openclaw/workspace-${name}`);
        if (!existsSync(workspacePath)) {
          throw new Error(`Workspace not found: ${workspacePath}. Create the agent workspace first.`);
        }

        const workDir = join(reposDir, name);
        if (existsSync(workDir)) {
          rmSync(workDir, { recursive: true, force: true });
        }
        mkdirSync(workDir, { recursive: true });

        const ocConfig = getOpenclawConfig();
        const ocAgent = ocConfig?.agents?.list?.find((a: any) => a.id === name);
        initAgentRepo(name, workspacePath, workDir, ocConfig, ocAgent);
        meta = getAgentMeta(name)!;
      }

      const gitDir = meta.gitDir;

      // Check if remote already exists
      const remotes = execSync('git remote -v', { cwd: gitDir, encoding: 'utf-8' }).toString();
      if (remotes.includes('origin')) {
        const remoteUrl = execSync('git remote get-url origin', { cwd: gitDir, encoding: 'utf-8' }).toString().trim();
        const match = remoteUrl.match(/github\.com[:/](.+?)(?:\.git)?$/);
        const existingRepo = match ? match[1] : null;
        console.log(chalk.yellow(`⚠️  Agent "${name}" already has a remote: ${existingRepo}`));
        console.log(chalk.gray('   Use pull to get latest, or manually push\n'));
        return;
      }

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

      // 3. Sync workspace to repo (ensure latest files are included)
      console.log(chalk.gray('  → Syncing workspace to repo...'));
      syncFromOpenclaw(gitDir, name);

      // 4. Push
      console.log(chalk.gray('  → Pushing to GitHub...'));
      try {
        execSync('git push -u origin main', { cwd: gitDir, stdio: 'inherit' });
      } catch {
        execSync('git push -u origin master', { cwd: gitDir, stdio: 'inherit' });
      }

      // 5. Update metadata
      meta.remote = `${username}/${repoName}`;
      meta.lastSync = new Date().toISOString();
      setAgentMeta(name, meta);

      console.log(chalk.green(`\n✅ Publish complete!\n`));
      console.log(chalk.gray(`   Repo: https://github.com/${username}/${repoName}`));
      console.log(chalk.gray(`   Pull: git clone git@github.com:${username}/${repoName}.git\n`));

    } catch (error: any) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  });
