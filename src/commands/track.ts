import { Command } from 'commander';
import chalk from 'chalk';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, cpSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { getReposDir, setAgentMeta, getAgentMeta, listAgents } from '../lib/store.js';
import { listOpenclawAgents, getOpenclawConfig, getOpenclawAgent, resolveDeclaredSkills } from '../lib/openclaw.js';
import { syncFromOpenclaw, syncRepoReadmes, syncToOpenclaw } from '../lib/git.js';

function exec(cmd: string, cwd: string, ignoreError = false): void {
  try {
    execSync(cmd, { cwd, stdio: 'inherit', shell: '/bin/bash' });
  } catch (e: any) {
    if (!ignoreError) {
      throw new Error(`Command failed: ${cmd}\n${e.message}`);
    }
  }
}

/**
 * Sync OpenClaw workspace → git repo and commit
 */
function syncAndCommit(workDir: string, agentName: string, message?: string): void {
  console.log(chalk.gray('  → Syncing files to repo...'));
  syncFromOpenclaw(workDir, agentName);

  const workspace = `workspace-${agentName}`;
  exec(`git add README.md README_zh.md ${workspace}/IDENTITY.md ${workspace}/SOUL.md ${workspace}/README.md ${workspace}/README_zh.md ${workspace}/skills/ 2>/dev/null || true`, workDir);

  const commitMsg = message || new Date().toISOString();
  try {
    exec(`git commit -m "${commitMsg}"`, workDir);
    console.log(chalk.green('  ✓ Committed'));
  } catch {
    console.log(chalk.yellow('  ⚠️  No changes to commit'));
  }
}

export const trackCommand = new Command('track')
  .description('Track an OpenClaw agent (initializes repo or syncs + commits current state)')
  .argument('[name]', 'Agent name (omitting lists available agents)')
  .option('-w, --workspace <path>', 'Specify workspace path')
  .option('-c, --config <path>', 'Specify config.json path to override')
  .action(async (name: string | undefined, options: any) => {
    try {
      const OC_HOME = homedir();
      const reposDir = getReposDir();

      // No name given, list available agents from openclaw.json
      if (!name) {
        const ocAgents = listOpenclawAgents();
        const managedAgents = listAgents();
        const managedNames = new Set(managedAgents.map(a => a.name));

        const available = ocAgents.filter(a => !managedNames.has(a));

        if (available.length === 0) {
          console.log(chalk.yellow('\nNo agents available to track\n'));
          console.log(chalk.gray('   Available agents:'));
          ocAgents.forEach(a => console.log(chalk.gray(`   - ${a}`)));
          console.log(chalk.blue('\n   Specify a name: openclaw-agent track <name>\n'));
          return;
        }

        console.log(chalk.blue('\n📋 Available agents:\n'));
        available.forEach((a, i) => {
          console.log(chalk.white(`  ${i + 1}. ${a}`));
        });
        console.log(chalk.blue('\n   Specify a name: openclaw-agent track <name>\n'));
        return;
      }

      const agentName = name;

      // Check if already managed — if so, sync + commit without re-initializing
      const existingMeta = getAgentMeta(agentName);
      if (existingMeta) {
        console.log(chalk.blue(`\n🔄 Agent "${agentName}" already tracked — syncing and committing current state\n`));
        console.log(`  ✓ Git repo: ${existingMeta.gitDir}`);
        syncAndCommit(existingMeta.gitDir, agentName);
        console.log(chalk.green(`\n✅ Done! Agent "${agentName}" synced and committed\n`));
        return;
      }

      // ── First time: initialize repo ───────────────────────────────────────

      console.log(chalk.blue(`\n🆕 Tracking agent: ${agentName}\n`));

      // 1. Find workspace path
      let workspacePath = options.workspace;
      if (!workspacePath) {
        workspacePath = join(OC_HOME, `.openclaw/workspace-${agentName}`);
      }

      // If workspace doesn't exist, create from template
      if (!existsSync(workspacePath)) {
        console.log(chalk.yellow('⚠️  No existing workspace found, creating from template'));
        workspacePath = join(OC_HOME, `.openclaw/workspace-${agentName}`);
        mkdirSync(workspacePath, { recursive: true });

        const templateDir = join(import.meta.dirname, '../../templates/default/workspace');
        cpSync(join(templateDir, 'SOUL.md'), join(workspacePath, 'SOUL.md'));
        cpSync(join(templateDir, 'AGENTS.md'), join(workspacePath, 'AGENTS.md'));
      }

      console.log(`  ✓ Workspace: ${workspacePath}`);

      // 2. Create Git repo
      let workDir = join(reposDir, agentName);
      console.log(chalk.gray('  → Initializing Git repo...'));

      // Only create fresh repo if workDir doesn't exist or isn't already a git repo
      const isExistingGitRepo = existsSync(join(workDir, '.git'));
      if (existsSync(workDir)) {
        if (!isExistingGitRepo) {
          rmSync(workDir, { recursive: true, force: true });
          mkdirSync(workDir, { recursive: true });
          exec('git init --initial-branch=main', workDir);
          exec('git config user.email "agent@local"', workDir);
          exec('git config user.name "OpenClaw Agent"', workDir);
        } else {
          console.log(chalk.gray('  → Using existing Git repo (preserving history and remotes)'));
        }
      } else {
        mkdirSync(workDir, { recursive: true });
        exec('git init --initial-branch=main', workDir);
        exec('git config user.email "agent@local"', workDir);
        exec('git config user.name "OpenClaw Agent"', workDir);
      }

      // 3. Create directories and copy files
      const workWorkspace = join(workDir, `workspace-${agentName}`);

      // Read openclaw.json to resolve skills
      const ocConfig = getOpenclawConfig();
      const ocAgent = getOpenclawAgent(agentName);
      const resolvedSkills = resolveDeclaredSkills(agentName, workspacePath);
      const skillsToSync = resolvedSkills.map(skill => skill.name);
      if (ocAgent?.skills && Array.isArray(ocAgent.skills)) {
        for (const skillEntry of ocAgent.skills) {
          const resolvedName = skillEntry.includes('/') ? skillEntry.split('/').pop()! : skillEntry;
          if (!resolvedSkills.some(skill => skill.name === resolvedName)) {
            console.log(chalk.yellow(`  ⚠️  Skill not found in any skill root: ${skillEntry}`));
          }
        }
      }

      // Copy persona files (Agent = persona config + skills + docs)
      mkdirSync(workWorkspace, { recursive: true });
      const personaFiles = ['IDENTITY.md', 'SOUL.md', 'README.md', 'README_zh.md'];
      for (const file of personaFiles) {
        const src = join(workspacePath, file);
        if (existsSync(src)) {
          cpSync(src, join(workWorkspace, file));
        }
      }
      syncRepoReadmes(workspacePath, workDir);

      // Copy template .gitignore
      const templateGitignore = join(import.meta.dirname, '../../templates/default/workspace/.gitignore');
      if (existsSync(templateGitignore)) {
        cpSync(templateGitignore, join(workWorkspace, '.gitignore'));
      }

      // Copy specified skills to workspace
      const destSkillsDir = join(workWorkspace, 'skills');
      if (resolvedSkills.length > 0) {
        mkdirSync(destSkillsDir, { recursive: true });
        for (const skill of resolvedSkills) {
          const destSkillDir = join(destSkillsDir, skill.name);
          mkdirSync(destSkillDir, { recursive: true });
          exec(`cp -r "${skill.path}/." "${destSkillDir}/" 2>/dev/null || true`, workDir);
          exec(`find "${destSkillDir}" -name '.git' -exec rm -rf {} + 2>/dev/null || true`, workDir);
        }
      }

      // 4. Create config.json
      let configJson: any = { id: agentName };
      if (ocAgent?.name) configJson.name = ocAgent.name;
      if (skillsToSync.length > 0) configJson.skills = skillsToSync;
      if (ocAgent?.identity) configJson.identity = ocAgent.identity;
      if (ocAgent?.subagents) configJson.subagents = ocAgent.subagents;
      if (ocAgent?.tools) configJson.tools = ocAgent.tools;

      if (options.config && existsSync(options.config)) {
        const cmdConfig = JSON.parse(readFileSync(options.config, 'utf-8'));
        configJson = { ...configJson, ...cmdConfig };
      }

      writeFileSync(join(workDir, 'config.json'), JSON.stringify(configJson, null, 2));

      // 5. Git commit
      exec('git add .', workDir);
      try {
        exec('git commit -m "init"', workDir);
      } catch {
        console.log(chalk.yellow('  ⚠️  No changes to commit'));
      }

      console.log(`  ✓ Git repo: ${workDir}`);

      // 6. Save metadata
      setAgentMeta(agentName, {
        name: agentName,
        workspace: workspacePath,
        gitDir: workDir,
        agentDir: join(OC_HOME, `.openclaw/agents/${agentName}`),
        config: configJson,
        remote: null,
        lastSync: new Date().toISOString()
      });

      console.log(chalk.green(`\n✅ Done! Agent "${agentName}" is now tracked\n`));
      console.log(chalk.gray(`   Git repo: ${workDir}`));
      console.log(chalk.gray(`   openclaw.json: ${chalk.yellow('Not modified. Run openclaw agents add manually if needed')}\n`));

    } catch (error: any) {
      console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
      process.exit(1);
    }
  });
