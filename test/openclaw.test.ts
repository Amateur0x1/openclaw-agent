import test from 'node:test';
import assert from 'node:assert/strict';
import { homedir } from 'os';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { backupPath, ensureDir, getOpenclawDir, restorePath } from './helpers.js';

test('registerAgent adds a new agent and normalizes workspace into a tilde path', async () => {
  const homeDir = homedir();
  const openclawDir = getOpenclawDir();
  const backup = backupPath(openclawDir);

  try {
    ensureDir(openclawDir);
    writeFileSync(join(openclawDir, 'openclaw.json'), JSON.stringify({ agents: { list: [] } }, null, 2));

    const openclaw = await import('../src/lib/openclaw.ts');
    const workspacePath = join(homeDir, 'custom-workspace-openclaw-agent-test');

    openclaw.registerAgent({
      id: 'agent-a',
      workspace: workspacePath,
      model: { primary: 'gpt-5' },
      skills: ['lint']
    });

    assert.deepEqual(openclaw.listOpenclawAgents(), ['agent-a']);
    assert.equal(openclaw.getAgentWorkspace('agent-a'), '~/custom-workspace-openclaw-agent-test');

    const saved = JSON.parse(readFileSync(join(openclawDir, 'openclaw.json'), 'utf-8'));
    assert.deepEqual(saved.agents.list[0], {
      id: 'agent-a',
      workspace: '~/custom-workspace-openclaw-agent-test',
      model: { primary: 'gpt-5' },
      skills: ['lint']
    });
  } finally {
    restorePath(backup);
  }
});

test('registerAgent updates an existing agent while preserving prior fields', async () => {
  const homeDir = homedir();
  const openclawDir = getOpenclawDir();
  const backup = backupPath(openclawDir);

  try {
    ensureDir(openclawDir);
    writeFileSync(
      join(openclawDir, 'openclaw.json'),
      JSON.stringify(
        {
          agents: {
            list: [
              {
                id: 'agent-a',
                workspace: '~/workspace-old',
                identity: { name: 'Old Name' }
              }
            ]
          }
        },
        null,
        2
      )
    );

    const openclaw = await import('../src/lib/openclaw.ts');

    openclaw.registerAgent({
      id: 'agent-a',
      workspace: join(homeDir, '.openclaw', 'workspace-agent-a'),
      subagents: { allowAgents: ['worker'] }
    });

    const saved = openclaw.getOpenclawConfig();
    assert.deepEqual(saved.agents.list[0], {
      id: 'agent-a',
      workspace: '~/.openclaw/workspace-agent-a',
      identity: { name: 'Old Name' },
      subagents: { allowAgents: ['worker'] }
    });
  } finally {
    restorePath(backup);
  }
});

test('registerAgent throws when OpenClaw has not been initialized, and unregisterAgent is safe', async () => {
  const homeDir = homedir();
  const openclawDir = getOpenclawDir();
  const backup = backupPath(openclawDir);

  try {
    const openclaw = await import('../src/lib/openclaw.ts');

    assert.throws(
      () => openclaw.registerAgent({ id: 'missing-config' }),
      /OpenClaw is not initialized/
    );

    assert.equal(openclaw.getOpenclawConfig(), null);
    assert.deepEqual(openclaw.listOpenclawAgents(), []);
    assert.equal(openclaw.getAgentWorkspace('missing-config'), null);
    assert.doesNotThrow(() => openclaw.unregisterAgent('missing-config'));
    assert.equal(openclaw.getOpenclawWorkspace(), join(homeDir, '.openclaw', 'workspace'));
  } finally {
    restorePath(backup);
  }
});
