import { Command } from 'commander';
import chalk from 'chalk';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, cpSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { getReposDir, setAgentMeta, listAgents } from '../lib/store.js';
import { listOpenclawAgents, getOpenclawConfig } from '../lib/openclaw.js';
import { syncToOpenclaw } from '../lib/git.js';
function exec(cmd, cwd, ignoreError = false) {
    try {
        execSync(cmd, { cwd, stdio: 'inherit', shell: '/bin/bash' });
    }
    catch (e) {
        if (!ignoreError) {
            throw new Error(`Command failed: ${cmd}\n${e.message}`);
        }
    }
}
export const trackCommand = new Command('track')
    .description('Put an existing OpenClaw agent under Git version control')
    .argument('[name]', 'Agent name (omitting lists available agents)')
    .option('-w, --workspace <path>', 'Specify workspace path')
    .option('-c, --config <path>', 'Specify config.json path to override')
    .action(async (name, options) => {
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
                console.log(chalk.gray('   Already managed:'));
                managedAgents.forEach(a => console.log(chalk.gray(`   - ${a.name}`)));
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
            mkdirSync(workspacePath, { recursive: true });
            const templateDir = join(import.meta.dirname, '../../templates/default/workspace');
            cpSync(join(templateDir, 'SOUL.md'), join(workspacePath, 'SOUL.md'));
            cpSync(join(templateDir, 'AGENTS.md'), join(workspacePath, 'AGENTS.md'));
        }
        console.log(`  ✓ Workspace: ${workspacePath}`);
        // 2. Create Git repo
        let workDir = join(reposDir, agentName);
        console.log(chalk.gray('  → Initializing Git repo...'));
        // Clean up existing
        if (existsSync(workDir)) {
            rmSync(workDir, { recursive: true, force: true });
        }
        mkdirSync(workDir, { recursive: true });
        exec('git init', workDir);
        exec('git config user.email "agent@local"', workDir);
        exec('git config user.name "OpenClaw Agent"', workDir);
        // 3. Create directories and copy files
        const workWorkspace = join(workDir, `workspace-${agentName}`);
        const workAgentDir = join(workDir, agentName);
        // Read openclaw.json to resolve skills
        const ocConfig = getOpenclawConfig();
        const ocAgent = ocConfig?.agents?.list?.find((a) => a.id === agentName);
        // Skill lookup: resolve skill names/paths from config
        const ocSkillsDirs = ocConfig?.skills?.load?.extraDirs ?? [];
        const managedSkillsDir = join(OC_HOME, '.openclaw', 'skills');
        const workspaceSkillsDir = join(workspacePath, 'skills');
        const allSkillsRoots = [managedSkillsDir, workspaceSkillsDir, ...ocSkillsDirs];
        /**
         * Find a skill directory by name
         * @param skillName - skill name
         * @returns full path to the skill directory, or null
         */
        function findSkillByName(skillName) {
            for (const root of allSkillsRoots) {
                const skillPath = join(root, skillName);
                if (existsSync(skillPath)) {
                    return skillPath;
                }
            }
            return null;
        }
        /**
         * Resolve a skill config entry to { name, path }
         * Entry can be a path or a name (requiring lookup)
         */
        function resolveSkillEntry(entry) {
            if (entry.includes('/')) {
                // Absolute path form
                const name = entry.split('/').pop();
                return existsSync(entry) ? { name, path: entry } : null;
            }
            else {
                // Name form, need to look up
                const path = findSkillByName(entry);
                return path ? { name: entry, path } : null;
            }
        }
        // Collect skills to sync
        const skillsToSync = [];
        if (ocAgent?.skills && Array.isArray(ocAgent.skills)) {
            for (const skillEntry of ocAgent.skills) {
                const resolved = resolveSkillEntry(skillEntry);
                if (!resolved) {
                    console.log(chalk.yellow(`  ⚠️  Skill not found: ${skillEntry}`));
                    continue;
                }
                const { name: skillName, path: skillPath } = resolved;
                skillsToSync.push(skillName);
            }
        }
        // Copy persona files (Agent = persona config + skills)
        mkdirSync(workWorkspace, { recursive: true });
        const personaFiles = ['AGENTS.md', 'IDENTITY.md', 'SOUL.md'];
        for (const file of personaFiles) {
            const src = join(workspacePath, file);
            if (existsSync(src)) {
                cpSync(src, join(workWorkspace, file));
            }
        }
        // Copy template .gitignore
        const templateGitignore = join(import.meta.dirname, '../../templates/default/workspace/.gitignore');
        if (existsSync(templateGitignore)) {
            cpSync(templateGitignore, join(workWorkspace, '.gitignore'));
        }
        // Copy specified skills to workspace
        const destSkillsDir = join(workWorkspace, 'skills');
        if (skillsToSync.length > 0) {
            mkdirSync(destSkillsDir, { recursive: true });
            for (const skillName of skillsToSync) {
                const resolved = resolveSkillEntry(skillName);
                if (!resolved)
                    continue;
                const { path: skillPath } = resolved;
                const destSkillDir = join(destSkillsDir, skillName);
                mkdirSync(destSkillDir, { recursive: true });
                exec(`cp -r "${skillPath}/." "${destSkillDir}/" 2>/dev/null || true`, workDir);
                exec(`find "${destSkillDir}" -name '.git' -exec rm -rf {} + 2>/dev/null || true`, workDir);
            }
        }
        // 4. Create config.json (only synced fields)
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
        // CLI config can override
        if (options.config && existsSync(options.config)) {
            const cmdConfig = JSON.parse(readFileSync(options.config, 'utf-8'));
            configJson = { ...configJson, ...cmdConfig };
        }
        const configPath = join(workDir, 'config.json');
        writeFileSync(configPath, JSON.stringify(configJson, null, 2));
        // 5. Git commit
        exec('git add .', workDir);
        try {
            exec('git commit -m "init"', workDir);
        }
        catch {
            console.log(chalk.yellow('  ⚠️  No changes to commit'));
        }
        console.log(`  ✓ Git repo: ${workDir}`);
        // 6. Sync to OpenClaw
        console.log(chalk.gray('  → Syncing to OpenClaw...'));
        syncToOpenclaw(workDir, agentName);
        // 7. Save metadata
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
    }
    catch (error) {
        console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
        process.exit(1);
    }
});
//# sourceMappingURL=track.js.map