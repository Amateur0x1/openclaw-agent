import { simpleGit, SimpleGit } from 'simple-git';
import { mkdirSync, existsSync, cpSync, rmSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { homedir } from 'os';
import { resolveDeclaredSkills } from './openclaw.js';

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

// Sync repo files to OpenClaw directory
export function syncToOpenclaw(gitDir: string, agentId: string): void {
  const OC_HOME = homedir();
  const workspaceDir = join(OC_HOME, `.openclaw/workspace-${agentId}`);

  // Sync workspace
  const srcWorkspace = join(gitDir, `workspace-${agentId}`);
  if (existsSync(srcWorkspace)) {
    mkdirSync(workspaceDir, { recursive: true });
    execSync(`cp -r "${srcWorkspace}/"* "${workspaceDir}/" 2>/dev/null || true`, { shell: '/bin/bash' });
    console.log(`  ✓ Synced workspace to ${workspaceDir}`);
  }

  // config.json is read at runtime, no need to sync to OpenClaw directory
}

// Sync OpenClaw to repo (persona files + skills only)
export function syncFromOpenclaw(gitDir: string, agentId: string): void {
  const OC_HOME = homedir();
  const workspaceDir = join(OC_HOME, `.openclaw/workspace-${agentId}`);

  // Only sync persona files and skills (Agent = persona config + skills)
  const destWorkspace = join(gitDir, `workspace-${agentId}`);
  const personaFiles = ['IDENTITY.md', 'SOUL.md', 'README.md', 'README_zh.md'];
  const srcSkillsDir = join(workspaceDir, 'skills');
  const destSkillsDir = join(destWorkspace, 'skills');
  const resolvedSkills = resolveDeclaredSkills(agentId, workspaceDir);

  if (existsSync(workspaceDir)) {
    mkdirSync(destWorkspace, { recursive: true });

    // Copy persona files
    for (const file of personaFiles) {
      const src = join(workspaceDir, file);
      if (existsSync(src)) {
        cpSync(src, join(destWorkspace, file));
      }
    }

    rmSync(destSkillsDir, { recursive: true, force: true });

    // Copy only skills declared in openclaw.json
    if (existsSync(srcSkillsDir) && resolvedSkills.length > 0) {
      mkdirSync(destSkillsDir, { recursive: true });
      for (const skill of resolvedSkills) {
        if (existsSync(skill.path)) {
          cpSync(skill.path, join(destSkillsDir, skill.name), { recursive: true });
        }
      }
    }

    console.log(`  ✓ Synced workspace to repo`);
  }
}
