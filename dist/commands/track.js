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
            throw new Error(`命令失败: ${cmd}\n${e.message}`);
        }
    }
}
export const trackCommand = new Command('track')
    .description('将 OpenClaw 现有 agent 纳入 Git 版本控制')
    .argument('[name]', 'Agent 名称（不指定则列出可用 agents）')
    .option('-w, --workspace <path>', '指定 workspace 路径')
    .option('-c, --config <path>', '指定 config.json 路径')
    .action(async (name, options) => {
    try {
        const OC_HOME = homedir();
        const reposDir = getReposDir();
        // 如果没有指定名字，从 openclaw.json 读取
        if (!name) {
            const ocAgents = listOpenclawAgents();
            const managedAgents = listAgents();
            const managedNames = new Set(managedAgents.map(a => a.name));
            // 过滤掉已管理的
            const available = ocAgents.filter(a => !managedNames.has(a));
            if (available.length === 0) {
                console.log(chalk.yellow('\n没有可初始化的 agent\n'));
                console.log(chalk.gray('   可用的 agents:'));
                ocAgents.forEach(a => console.log(chalk.gray(`   - ${a}`)));
                console.log(chalk.gray('   已管理的:'));
                managedAgents.forEach(a => console.log(chalk.gray(`   - ${a.name}`)));
                console.log(chalk.blue('\n   请指定名称: openclaw-agent init <name>\n'));
                return;
            }
            console.log(chalk.blue('\n📋 可初始化的 agents:\n'));
            available.forEach((a, i) => {
                console.log(chalk.white(`  ${i + 1}. ${a}`));
            });
            console.log(chalk.blue('\n   请指定名称: openclaw-agent init <name>\n'));
            return;
        }
        const agentName = name;
        console.log(chalk.blue(`\n🆕 初始化 agent: ${agentName}\n`));
        // 1. 查找 workspace 路径（先用 agentName，后续可能重命名）
        let workspacePath = options.workspace;
        if (!workspacePath) {
            workspacePath = join(OC_HOME, `.openclaw/workspace-${agentName}`);
        }
        // 如果 workspace 不存在，用模板创建
        if (!existsSync(workspacePath)) {
            console.log(chalk.yellow('⚠️  未找到现有 workspace，使用模板创建'));
            workspacePath = join(OC_HOME, `.openclaw/workspace-${agentName}`);
            mkdirSync(workspacePath, { recursive: true });
            mkdirSync(workspacePath, { recursive: true });
            const templateDir = join(import.meta.dirname, '../../templates/default/workspace');
            cpSync(join(templateDir, 'SOUL.md'), join(workspacePath, 'SOUL.md'));
            cpSync(join(templateDir, 'AGENTS.md'), join(workspacePath, 'AGENTS.md'));
        }
        console.log(`  ✓ Workspace: ${workspacePath}`);
        // 2. 创建 Git 仓库（普通仓库，不是 bare）
        let workDir = join(reposDir, agentName);
        console.log(chalk.gray('  → 初始化 Git 仓库...'));
        // 清理已存在的
        if (existsSync(workDir)) {
            rmSync(workDir, { recursive: true, force: true });
        }
        mkdirSync(workDir, { recursive: true });
        exec('git init', workDir);
        exec('git config user.email "agent@local"', workDir);
        exec('git config user.name "OpenClaw Agent"', workDir);
        // 3. 创建目录并复制文件
        const workWorkspace = join(workDir, `workspace-${agentName}`);
        const workAgentDir = join(workDir, agentName);
        // 先读取 openclaw.json 获取要转换的 skills
        const ocConfig = getOpenclawConfig();
        const ocAgent = ocConfig?.agents?.list?.find((a) => a.id === agentName);
        // 处理 skills：先创建 skills 目录并复制指定的 skills
        const skillsToSync = [];
        if (ocAgent?.skills && Array.isArray(ocAgent.skills)) {
            mkdirSync(join(workWorkspace, 'skills'), { recursive: true });
            for (const skillPath of ocAgent.skills) {
                const skillName = skillPath.split('/').pop();
                const destSkillDir = join(workWorkspace, 'skills', skillName);
                if (existsSync(skillPath)) {
                    mkdirSync(destSkillDir, { recursive: true });
                    exec(`cp -r "${skillPath}/." "${destSkillDir}/" 2>/dev/null || true`, workDir);
                    exec(`find "${destSkillDir}" -name '.git' -exec rm -rf {} + 2>/dev/null || true`, workDir);
                    skillsToSync.push(`~/.openclaw/workspace-${agentName}/skills/${skillName}`);
                }
            }
        }
        // 复制 workspace（排除 .git 和 skills）
        mkdirSync(workWorkspace, { recursive: true });
        exec(`cp -r "${workspacePath}/"* "${workWorkspace}/" 2>/dev/null || true`, workDir);
        // 删除不需要的 skills 目录，只保留指定的
        const destSkillsDir = join(workWorkspace, 'skills');
        if (existsSync(destSkillsDir)) {
            exec(`rm -rf "${destSkillsDir}"`, workDir);
        }
        if (skillsToSync.length > 0) {
            mkdirSync(destSkillsDir, { recursive: true });
            for (const skillPath of ocAgent.skills) {
                const skillName = skillPath.split('/').pop();
                const destSkillDir = join(workWorkspace, 'skills', skillName);
                if (existsSync(skillPath)) {
                    mkdirSync(destSkillDir, { recursive: true });
                    exec(`cp -r "${skillPath}/." "${destSkillDir}/" 2>/dev/null || true`, workDir);
                    exec(`find "${destSkillDir}" -name '.git' -exec rm -rf {} + 2>/dev/null || true`, workDir);
                }
            }
        }
        // 复制 .gitignore
        const templateGitignore = join(import.meta.dirname, '../../templates/default/workspace/.gitignore');
        if (existsSync(templateGitignore)) {
            cpSync(templateGitignore, join(workWorkspace, '.gitignore'));
        }
        // 不再同步 agent 目录，只需要 config.json（在第4步创建）
        // 4. 创建 config.json（只导出部分字段）
        // ocAgent 已在前面定义
        let configJson = { id: agentName };
        // 只导出允许同步的字段
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
        // 命令行指定的配置可以覆盖
        if (options.config && existsSync(options.config)) {
            const cmdConfig = JSON.parse(readFileSync(options.config, 'utf-8'));
            configJson = { ...configJson, ...cmdConfig };
        }
        const configPath = join(workDir, 'config.json');
        writeFileSync(configPath, JSON.stringify(configJson, null, 2));
        // 5. Git 提交
        exec('git add .', workDir);
        try {
            exec('git commit -m "init"', workDir);
        }
        catch {
            console.log(chalk.yellow('  ⚠️  没有需要提交的更改'));
        }
        console.log(`  ✓ Git 仓库: ${workDir}`);
        // 6. 同步到 OpenClaw 实际目录
        console.log(chalk.gray('  → 同步到 OpenClaw...'));
        syncToOpenclaw(workDir, agentName);
        // 7. 保存元数据（用 agentName 作为 key）
        setAgentMeta(agentName, {
            name: agentName,
            workspace: workspacePath,
            gitDir: workDir,
            agentDir: join(OC_HOME, `.openclaw/agents/${agentName}`),
            config: configJson,
            remote: null,
            lastSync: new Date().toISOString()
        });
        console.log(chalk.green(`\n✅ 完成！Agent "${agentName}" 已初始化\n`));
        console.log(chalk.gray(`   Git 仓库: ${workDir}`));
        console.log(chalk.gray(`   openclaw.json: ${chalk.yellow('未修改，请手动运行 openclaw agents add 添加')}\n`));
    }
    catch (error) {
        console.error(chalk.red(`\n❌ 错误: ${error.message}\n`));
        process.exit(1);
    }
});
//# sourceMappingURL=track.js.map