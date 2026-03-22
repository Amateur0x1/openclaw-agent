import { simpleGit } from 'simple-git';
import { mkdirSync, existsSync, cpSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { homedir } from 'os';
export function openGitRepo(path) {
    return simpleGit(path);
}
export function gitAdd(git, files) {
    git.add(files);
}
export function gitCommit(git, message) {
    git.commit(message);
}
export function gitPush(git, remote, branch) {
    git.push(remote || 'origin', branch || 'main');
}
export function gitPull(git, remote, branch) {
    git.pull(remote || 'origin', branch || 'main');
}
export function gitLog(git, maxCount = 10) {
    const log = git.log();
    log.then(result => {
        result.all.forEach(commit => {
            console.log(`  ${commit.hash.substring(0, 7)} - ${commit.message} (${commit.date})`);
        });
    });
}
export function gitRemoteAdd(git, name, url) {
    git.addRemote(name, url);
}
export function hasRemote(git, name = 'origin') {
    const remotes = git.getRemotes(true);
    return remotes.some((r) => r.name === name);
}
// 同步仓库到 OpenClaw 目录
export function syncToOpenclaw(gitDir, agentId) {
    const OC_HOME = homedir();
    const workspaceDir = join(OC_HOME, `.openclaw/workspace-${agentId}`);
    // 同步 workspace
    const srcWorkspace = join(gitDir, `workspace-${agentId}`);
    if (existsSync(srcWorkspace)) {
        mkdirSync(workspaceDir, { recursive: true });
        execSync(`cp -r "${srcWorkspace}/"* "${workspaceDir}/" 2>/dev/null || true`, { shell: '/bin/bash' });
        console.log(`  ✓ 已同步 workspace 到 ${workspaceDir}`);
    }
    // config.json 已在运行时读取，不需要同步到 OpenClaw 目录
}
// 同步 OpenClaw 到仓库（只同步人设文件 + skills）
export function syncFromOpenclaw(gitDir, agentId) {
    const OC_HOME = homedir();
    const workspaceDir = join(OC_HOME, `.openclaw/workspace-${agentId}`);
    // 只同步人设配置文件和 skills（Agent = 人设配置 + skills）
    const destWorkspace = join(gitDir, `workspace-${agentId}`);
    const personaFiles = ['AGENTS.md', 'IDENTITY.md', 'SOUL.md'];
    const srcSkillsDir = join(workspaceDir, 'skills');
    if (existsSync(workspaceDir)) {
        mkdirSync(destWorkspace, { recursive: true });
        // 复制人设文件
        for (const file of personaFiles) {
            const src = join(workspaceDir, file);
            if (existsSync(src)) {
                cpSync(src, join(destWorkspace, file));
            }
        }
        // 复制 skills 目录（如果有）
        if (existsSync(srcSkillsDir)) {
            const destSkillsDir = join(destWorkspace, 'skills');
            cpSync(srcSkillsDir, destSkillsDir, { recursive: true });
        }
        console.log(`  ✓ 已同步 workspace 到仓库`);
    }
}
//# sourceMappingURL=git.js.map