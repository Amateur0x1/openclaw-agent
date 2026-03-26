import test from 'node:test';
import assert from 'node:assert/strict';
import { homedir } from 'os';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { backupPath, cleanupTempDir, createTempHome, ensureDir, getOpenclawDir, restorePath } from './helpers.js';

test('syncToOpenclaw copies repo workspace files into the OpenClaw workspace', async () => {
  const tempDir = createTempHome('git-sync-to');
  const homeDir = homedir();
  const openclawDir = getOpenclawDir();
  const backup = backupPath(openclawDir);

  try {
    const gitModule = await import('../src/lib/git.ts');
    const repoDir = join(tempDir, 'repo');
    const srcWorkspace = join(repoDir, 'workspace-agent-a');
    ensureDir(srcWorkspace);
    writeFileSync(join(srcWorkspace, 'AGENTS.md'), '# agent');
    writeFileSync(join(srcWorkspace, 'SOUL.md'), '# soul');

    gitModule.syncToOpenclaw(repoDir, 'agent-a');

    const destWorkspace = join(homeDir, '.openclaw', 'workspace-agent-a');
    assert.equal(readFileSync(join(destWorkspace, 'AGENTS.md'), 'utf-8'), '# agent');
    assert.equal(readFileSync(join(destWorkspace, 'SOUL.md'), 'utf-8'), '# soul');
  } finally {
    cleanupTempDir(tempDir);
    restorePath(backup);
  }
});

test('syncFromOpenclaw copies persona files and skills back into the repo workspace only', async () => {
  const tempDir = createTempHome('git-sync-from');
  const homeDir = homedir();
  const openclawDir = getOpenclawDir();
  const backup = backupPath(openclawDir);

  try {
    const gitModule = await import('../src/lib/git.ts');
    const workspaceDir = join(homeDir, '.openclaw', 'workspace-agent-b');
    ensureDir(openclawDir);
    writeFileSync(
      join(openclawDir, 'openclaw.json'),
      JSON.stringify({
        agents: {
          list: [
            {
              id: 'agent-b',
              skills: ['reviewer']
            }
          ]
        }
      }, null, 2)
    );
    ensureDir(join(workspaceDir, 'skills', 'reviewer'));
    ensureDir(join(workspaceDir, 'skills', 'ignored'));
    writeFileSync(join(workspaceDir, 'IDENTITY.md'), 'identity');
    writeFileSync(join(workspaceDir, 'SOUL.md'), 'soul');
    writeFileSync(join(workspaceDir, 'notes.txt'), 'should stay out');
    writeFileSync(join(workspaceDir, 'skills', 'reviewer', 'SKILL.md'), 'review skill');
    writeFileSync(join(workspaceDir, 'skills', 'ignored', 'SKILL.md'), 'ignored skill');

    const repoDir = join(tempDir, 'repo');
    ensureDir(repoDir);

    gitModule.syncFromOpenclaw(repoDir, 'agent-b');

    const destWorkspace = join(repoDir, 'workspace-agent-b');
    assert.equal(readFileSync(join(destWorkspace, 'IDENTITY.md'), 'utf-8'), 'identity');
    assert.equal(readFileSync(join(destWorkspace, 'SOUL.md'), 'utf-8'), 'soul');
    assert.equal(readFileSync(join(destWorkspace, 'skills', 'reviewer', 'SKILL.md'), 'utf-8'), 'review skill');
    assert.equal(existsSync(join(destWorkspace, 'skills', 'ignored')), false);
    assert.equal(existsSync(join(destWorkspace, 'notes.txt')), false);
  } finally {
    cleanupTempDir(tempDir);
    restorePath(backup);
  }
});
