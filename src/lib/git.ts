import { simpleGit, SimpleGit } from 'simple-git';
import { mkdirSync, existsSync, cpSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { homedir } from 'os';

export function openGitRepo(path: string): SimpleGit {
  return simpleGit(path);
}

export function gitAdd(git: SimpleGit, files: string[]): void {
  git.add(files);
}

export function gitCommit(git: SimpleGit, message: string): void {
  git.commit(message);
}

export function gitPush(git: SimpleGit, remote?: string, branch?: string): void {
  git.push(remote || 'origin', branch || 'main');
}

export function gitPull(git: SimpleGit, remote?: string, branch?: string): void {
  git.pull(remote || 'origin', branch || 'main');
}

export function gitLog(git: SimpleGit, maxCount = 10): void {
  const log = git.log();
  log.then(result => {
    result.all.forEach(commit => {
      console.log(`  ${commit.hash.substring(0, 7)} - ${commit.message} (${commit.date})`);
    });
  });
}

export function gitRemoteAdd(git: SimpleGit, name: string, url: string): void {
  git.addRemote(name, url);
}

export function hasRemote(git: SimpleGit, name = 'origin'): boolean {
  const remotes = git.getRemotes(true);
  return (remotes as any).some((r: any) => r.name === name);
}

// 同步仓库到 OpenClaw 目录
export function syncToOpenclaw(gitDir: string, agentId: string): void {
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
export function syncFromOpenclaw(gitDir: string, agentId: string): void {
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
