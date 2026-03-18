import { Command } from 'commander';
import chalk from 'chalk';
import { homedir } from 'os';
import { execSync } from 'child_process';
import { getAgentMeta, setAgentMeta } from '../lib/store.js';
import { getOpenclawConfig } from '../lib/openclaw.js';
import { syncToOpenclaw } from '../lib/git.js';
export const syncCommand = new Command('sync')
    .description('同步 agent：从远程拉取改动并导入到 OpenClaw')
    .argument('<name>', 'Agent 名称')
    .option('--no-import', '只拉取不同步到 OpenClaw')
    .action(async (name, options) => {
    try {
        const meta = getAgentMeta(name);
        if (!meta) {
            throw new Error(`未找到 agent: ${name}`);
        }
        if (!meta.remote) {
            throw new Error(`agent "${name}" 未关联远程仓库，请先运行 publish`);
        }
        console.log(chalk.blue(`\n🔄 同步 agent: ${name}\n`));
        const workDir = meta.gitDir;
        // 1. 拉取远程改动
        console.log(chalk.gray('  → 拉取远程改动...'));
        try {
            execSync('git fetch origin', { cwd: workDir, stdio: 'inherit' });
            execSync('git pull origin main', { cwd: workDir, stdio: 'inherit' });
        }
        catch {
            // 可能分支是 master
            execSync('git pull origin master', { cwd: workDir, stdio: 'inherit' });
        }
        // 2. 如果不需要导入，直接返回
        if (options.import === false) {
            console.log(chalk.yellow('  ⚠️  已拉取远程改动，但跳过导入\n'));
            return;
        }
        // 3. 检查 openclaw.json 中该 agent 是否已存在
        const ocConfig = getOpenclawConfig();
        const existingAgent = ocConfig?.agents?.list?.find((a) => a.id === name);
        let workspacePath;
        if (existingAgent?.workspace) {
            // 已存在，直接读取 workspace 路径
            workspacePath = existingAgent.workspace.replace('~', homedir());
        }
        else {
            // 不存在，调用 openclaw agents add（传 name，让用户交互式填写 workspace）
            console.log(chalk.gray('  → 调用 openclaw agents add...'));
            console.log(chalk.gray(`   （请在交互提示中填写 workspace，agent id 已预设: ${name}）`));
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
        // 4. 同步 workspace 文件（Git → OpenClaw）
        console.log(chalk.gray('  → 同步 workspace 文件...'));
        syncToOpenclaw(workDir, name);
        // 5. 更新元数据
        meta.lastSync = new Date().toISOString();
        setAgentMeta(name, meta);
        console.log(chalk.green(`\n✅ 同步完成！\n`));
    }
    catch (error) {
        console.error(chalk.red(`\n❌ 错误: ${error.message}\n`));
        process.exit(1);
    }
});
//# sourceMappingURL=sync.js.map