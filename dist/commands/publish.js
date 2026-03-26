import { Command } from 'commander';
import chalk from 'chalk';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, cpSync, writeFileSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { getReposDir, setAgentMeta, getAgentMeta } from '../lib/store.js';
import { getGhUsername, createGitHubRepo, getSshUrl, isGhInstalled } from '../lib/github.js';
import { syncFromOpenclaw } from '../lib/git.js';
import { getOpenclawConfig, getOpenclawAgent, resolveDeclaredSkills } from '../lib/openclaw.js';
function exec(cmd, cwd, ignoreError = false) {
    try {
        execSync(cmd, { cwd, stdio: 'inherit', shell: '/bin/bash' });
    }
    catch (e) {
        if (!ignoreError)
            throw new Error(`Command failed: ${cmd}\n${e.message}`);
    }
}
function parseGitHubFullName(remoteUrl) {
    const match = remoteUrl.trim().match(/github\.com[:/]([^/\s]+\/[^/\s]+?)(?:\.git)?$/);
    return match?.[1] || null;
}
function ensureGitHubRepoExists(remoteUrl, fallbackRepoName, agentName) {
    const fullName = parseGitHubFullName(remoteUrl);
    if (!fullName || !isGhInstalled())
        return;
    try {
        execSync(`gh repo view ${fullName}`, { stdio: 'ignore' });
        return;
    }
    catch { }
    const username = getGhUsername();
    const [owner] = fullName.split('/');
    if (owner !== username) {
        throw new Error(`Remote repo ${fullName} does not exist or you do not have access`);
    }
    console.log(chalk.gray('  → Repo not found, creating GitHub repo...'));
    createGitHubRepo(fallbackRepoName, `OpenClaw Agent: ${agentName}`);
}
function ensureRepoForPublish(hasRemote, gitDir, username, repoName, agentName) {
    if (hasRemote) {
        const remoteUrl = execSync('git remote get-url origin', { cwd: gitDir, encoding: 'utf-8' }).toString().trim();
        const match = remoteUrl.match(/github\.com[:/](.+?)(?:\.git)?$/);
        console.log(chalk.gray(`   Repo: ${match ? match[1] : remoteUrl}\n`));
        ensureGitHubRepoExists(remoteUrl, repoName, agentName);
        return remoteUrl;
    }
    const fullName = `${username}/${repoName}`;
    const remoteUrl = getSshUrl(fullName);
    console.log(chalk.gray(`   Repo: ${fullName}\n`));
    ensureGitHubRepoExists(remoteUrl, repoName, agentName);
    execSync(`git remote add origin ${remoteUrl}`, { cwd: gitDir, stdio: 'inherit' });
    return remoteUrl;
}
/**
 * Initialize a new git repo for an agent (same logic as track first-time)
 */
function initAgentRepo(agentName, workspacePath, workDir, ocConfig, ocAgent) {
    const OC_HOME = homedir();
    const workWorkspace = join(workDir, `workspace-${agentName}`);
    const resolvedSkills = resolveDeclaredSkills(agentName, workspacePath);
    const skillsToSync = resolvedSkills.map(skill => skill.name);
    // Copy persona files
    mkdirSync(workWorkspace, { recursive: true });
    const personaFiles = ['IDENTITY.md', 'SOUL.md', 'README.md', 'README_zh.md'];
    for (const file of personaFiles) {
        const src = join(workspacePath, file);
        if (existsSync(src))
            cpSync(src, join(workWorkspace, file));
    }
    // Copy .gitignore
    const templateGitignore = join(import.meta.dirname, '../../templates/default/workspace/.gitignore');
    if (existsSync(templateGitignore))
        cpSync(templateGitignore, join(workWorkspace, '.gitignore'));
    // Copy skills
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
    // Create config.json
    let configJson = { id: agentName };
    if (ocAgent?.name)
        configJson.name = ocAgent.name;
    if (skillsToSync.length > 0)
        configJson.skills = skillsToSync;
    if (ocAgent?.identity)
        configJson.identity = ocAgent.identity;
    if (ocAgent?.subagents)
        configJson.subagents = ocAgent.subagents;
    if (ocAgent?.tools)
        configJson.tools = ocAgent.tools;
    writeFileSync(join(workDir, 'config.json'), JSON.stringify(configJson, null, 2));
    // Git init
    exec('git init --initial-branch=main', workDir);
    exec('git config user.email "agent@local"', workDir);
    exec('git config user.name "OpenClaw Agent"', workDir);
    exec('git add .', workDir);
    try {
        exec('git commit -m "init"', workDir);
    }
    catch { }
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
    .action(async (name, options) => {
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
            const ocAgent = getOpenclawAgent(name);
            initAgentRepo(name, workspacePath, workDir, ocConfig, ocAgent);
            meta = getAgentMeta(name);
        }
        const gitDir = meta.gitDir;
        // Check if remote already exists
        const remotes = execSync('git remote -v', { cwd: gitDir, encoding: 'utf-8' }).toString();
        const hasRemote = remotes.includes('origin');
        const agentId = meta.config?.id || name;
        const repoName = options.repo || agentId;
        const username = getGhUsername();
        console.log(chalk.blue(`\n🚀 Publishing ${name} to GitHub\n`));
        ensureRepoForPublish(hasRemote, gitDir, username, repoName, name);
        // 3. Sync workspace to repo (ensure latest files are included)
        console.log(chalk.gray('  → Syncing workspace to repo...'));
        syncFromOpenclaw(gitDir, name);
        // 4. Ensure at least one commit exists before pushing
        exec('git add .', gitDir);
        try {
            exec('git commit -m "update"', gitDir);
        }
        catch { }
        // 5. If main branch doesn't exist locally but master does, rename to main
        const localBranches = execSync('git branch', { cwd: gitDir, encoding: 'utf-8' });
        if (!localBranches.includes('main') && localBranches.includes('master')) {
            exec('git branch -m master main', gitDir);
        }
        // 6. Try push — if repo doesn't exist yet, create it and retry
        console.log(chalk.gray('  → Pushing to GitHub...'));
        try {
            execSync('git push -u origin main', { cwd: gitDir, stdio: 'inherit' });
        }
        catch (pushErr) {
            const errMsg = pushErr.message || '';
            if (errMsg.includes('Repository not found') || errMsg.includes('404')) {
                console.log(chalk.gray('  → Repo not found, creating GitHub repo...'));
                createGitHubRepo(repoName, `OpenClaw Agent: ${name}`);
                execSync('git push -u origin main', { cwd: gitDir, stdio: 'inherit' });
            }
            else {
                throw pushErr;
            }
        }
        // 5. Update metadata (only set remote if newly created)
        if (!hasRemote) {
            meta.remote = `${username}/${repoName}`;
        }
        meta.lastSync = new Date().toISOString();
        setAgentMeta(name, meta);
        const displayRepo = hasRemote
            ? execSync('git remote get-url origin', { cwd: gitDir, encoding: 'utf-8' }).toString().trim().match(/github\.com[:/](.+?)(?:\.git)?$/)?.[1] || meta.remote
            : `${username}/${repoName}`;
        console.log(chalk.green(`\n✅ Publish complete!\n`));
        console.log(chalk.gray(`   Repo: https://github.com/${displayRepo}`));
        console.log(chalk.gray(`   Pull: git clone git@github.com:${displayRepo}.git\n`));
    }
    catch (error) {
        console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
        process.exit(1);
    }
});
//# sourceMappingURL=publish.js.map