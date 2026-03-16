import { simpleGit } from 'simple-git';
import { mkdirSync, existsSync } from 'fs';
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
    const agentDir = join(OC_HOME, `.openclaw/agents/${agentId}`);
    // 同步 workspace-zhuliren
    const srcWorkspace = join(gitDir, `workspace-${agentId}`);
    if (existsSync(srcWorkspace)) {
        mkdirSync(workspaceDir, { recursive: true });
        execSync(`cp -r "${srcWorkspace}/"* "${workspaceDir}/" 2>/dev/null || true`, { shell: '/bin/bash' });
        console.log(`  ✓ 已同步 workspace 到 ${workspaceDir}`);
    }
    // 同步 zhuliren（不是 agent）
    const srcAgent = join(gitDir, agentId);
    if (existsSync(srcAgent)) {
        mkdirSync(agentDir, { recursive: true });
        execSync(`cp -r "${srcAgent}/"* "${agentDir}/" 2>/dev/null || true`, { shell: '/bin/bash' });
        console.log(`  ✓ 已同步 agent 到 ${agentDir}`);
    }
}
// 同步 OpenClaw 到仓库
export function syncFromOpenclaw(gitDir, agentId) {
    const OC_HOME = homedir();
    const workspaceDir = join(OC_HOME, `.openclaw/workspace-${agentId}`);
    const agentDir = join(OC_HOME, `.openclaw/agents/${agentId}`);
    // 同步 workspace 到仓库
    const destWorkspace = join(gitDir, `workspace-${agentId}`);
    if (existsSync(workspaceDir)) {
        mkdirSync(destWorkspace, { recursive: true });
        execSync(`cp -r "${workspaceDir}/"* "${destWorkspace}/" 2>/dev/null || true`, { shell: '/bin/bash' });
        console.log(`  ✓ 已同步 workspace 到仓库`);
    }
    // 同步 agent 到仓库
    const destAgent = join(gitDir, agentId);
    if (existsSync(agentDir)) {
        mkdirSync(destAgent, { recursive: true });
        execSync(`cp -r "${agentDir}/"* "${destAgent}/" 2>/dev/null || true`, { shell: '/bin/bash' });
        console.log(`  ✓ 已同步 agent 到仓库`);
    }
}
//# sourceMappingURL=git.js.map