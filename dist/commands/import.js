import { Command } from 'commander';
import chalk from 'chalk';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { getAgentMeta } from '../lib/store.js';
import { getOpenclawConfig, registerAgent } from '../lib/openclaw.js';
import { syncToOpenclaw } from '../lib/git.js';
export const importCommand = new Command('import')
    .description('将已 track 的 agent 导入到 OpenClaw（注册配置）')
    .argument('<name>', '已 track 的 agent 名称')
    .action(async (name, options) => {
    try {
        const meta = getAgentMeta(name);
        if (!meta) {
            throw new Error(`未找到 agent: ${name}，请先运行 track 或 clone`);
        }
        console.log(chalk.blue(`\n📥 导入 agent: ${name}\n`));
        // 1. 读取 config.json
        const configPath = join(meta.gitDir, 'config.json');
        if (!existsSync(configPath)) {
            throw new Error('未找到 config.json，请确认该 agent 已 track');
        }
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        // 2. 检查 openclaw.json 中该 agent 是否已存在
        const ocConfig = getOpenclawConfig();
        const existingAgent = ocConfig?.agents?.list?.find((a) => a.id === name);
        let workspacePath;
        if (existingAgent?.workspace) {
            // 已存在，直接读取 workspace 路径
            console.log(chalk.gray('  → Agent 已存在，直接读取 workspace 路径'));
            workspacePath = existingAgent.workspace.replace('~', homedir());
        }
        else {
            // 不存在，调用 openclaw agents add（传 name，让用户交互式填写 workspace）
            console.log(chalk.gray('  → 调用 openclaw agents add...'));
            console.log(chalk.gray(`   （请在交互提示中填写 workspace，agent id 已预设: ${name}）`));
            // 调用原生命令（传 name 位置参数）
            execSync(`openclaw agents add ${name}`, {
                stdio: 'inherit',
                shell: '/bin/bash'
            });
            // 重新读取配置获取 workspace 路径
            const newOcConfig = getOpenclawConfig();
            const newAgent = newOcConfig?.agents?.list?.find((a) => a.id === name);
            if (!newAgent?.workspace) {
                throw new Error('openclaw agents add 未能正确设置 workspace');
            }
            workspacePath = newAgent.workspace.replace('~', homedir());
        }
        console.log(`  → Workspace: ${workspacePath}`);
        // 3. 同步 workspace 文件（Git → OpenClaw）
        console.log(chalk.gray('  → 同步 workspace 文件...'));
        syncToOpenclaw(meta.gitDir, name);
        // 4. 更新 openclaw.json 中的 skills 配置（只更新 skills）
        if (config.skills && Array.isArray(config.skills) && config.skills.length > 0) {
            console.log(chalk.gray('  → 更新 agent skills 配置...'));
            registerAgent({
                id: name,
                skills: config.skills,
            });
        }
        console.log(chalk.green(`\n✅ 导入完成！\n`));
    }
    catch (error) {
        console.error(chalk.red(`\n❌ 错误: ${error.message}\n`));
        process.exit(1);
    }
});
//# sourceMappingURL=import.js.map