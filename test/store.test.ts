import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'fs';
import { join } from 'path';

import { backupPath, getOpenclawAgentsDir, restorePath } from './helpers.js';

test('store persists agent metadata and supports lookup by key and config.id', async () => {
  const agentsDir = getOpenclawAgentsDir();
  const backup = backupPath(agentsDir);

  try {
    const store = await import('../src/lib/store.ts');
    const meta = {
      name: 'managed-name',
      workspace: '/tmp/workspace-managed-name',
      gitDir: '/tmp/repo-managed-name',
      agentDir: '/tmp/agent-managed-name',
      config: {
        id: 'config-id',
        model: { primary: 'gpt-5' }
      },
      remote: 'owner/repo',
      lastSync: '2026-03-23T10:00:00.000Z'
    };

    assert.equal(store.getAgentsDir(), agentsDir);
    assert.equal(store.getReposDir(), join(agentsDir, 'repos'));

    store.setAgentMeta('managed-name', meta);

    assert.deepEqual(store.getAgentMeta('managed-name'), meta);
    assert.deepEqual(store.getAgentMeta('config-id'), meta);
    assert.deepEqual(store.listAgents(), [meta]);
  } finally {
    restorePath(backup);
  }
});

test('store falls back to an empty index when agents.json is missing or invalid', async () => {
  const agentsDir = getOpenclawAgentsDir();
  const backup = backupPath(agentsDir);

  try {
    const { ensureDir } = await import('./helpers.js');
    ensureDir(agentsDir);
    writeFileSync(join(agentsDir, 'agents.json'), 'not json');

    const store = await import('../src/lib/store.ts');
    assert.deepEqual(store.loadAgentsIndex(), { version: '1.0', agents: {} });
    assert.equal(store.getAgentMeta('missing'), null);
    assert.deepEqual(store.listAgents(), []);
  } finally {
    restorePath(backup);
  }
});

test('store removes metadata by key or by config.id', async () => {
  const agentsDir = getOpenclawAgentsDir();
  const backup = backupPath(agentsDir);

  try {
    const store = await import('../src/lib/store.ts');

    store.setAgentMeta('alpha', {
      name: 'alpha',
      workspace: '/tmp/workspace-alpha',
      gitDir: '/tmp/repo-alpha',
      agentDir: '/tmp/agent-alpha',
      config: { id: 'alpha-id' },
      remote: null,
      lastSync: '2026-03-23T10:00:00.000Z'
    });
    store.setAgentMeta('beta', {
      name: 'beta',
      workspace: '/tmp/workspace-beta',
      gitDir: '/tmp/repo-beta',
      agentDir: '/tmp/agent-beta',
      config: { id: 'beta-id' },
      remote: null,
      lastSync: '2026-03-23T11:00:00.000Z'
    });

    store.removeAgentMeta('alpha-id');
    assert.equal(store.getAgentMeta('alpha'), null);
    assert.deepEqual(
      store.listAgents().map(agent => agent.name),
      ['beta']
    );

    store.removeAgentMeta('beta');
    assert.deepEqual(store.listAgents(), []);
  } finally {
    restorePath(backup);
  }
});
