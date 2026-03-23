import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'fs';
import { join } from 'path';

import { createTempHome, cleanupTempDir, ensureDir, importFreshModule } from './helpers.js';

test('loadAgentConfig reads valid config.json and resolves standard paths', async () => {
  const tempDir = createTempHome('config-valid');

  try {
    const repoDir = join(tempDir, 'repo');
    ensureDir(repoDir);
    writeFileSync(
      join(repoDir, 'config.json'),
      JSON.stringify({
        id: 'demo-agent',
        model: { primary: 'gpt-5' },
        skills: ['review']
      })
    );

    const configModule = await importFreshModule<typeof import('../src/lib/config.js')>('./lib/config.ts');

    assert.deepEqual(configModule.loadAgentConfig(repoDir), {
      id: 'demo-agent',
      model: { primary: 'gpt-5' },
      skills: ['review']
    });
    assert.equal(configModule.getWorkspaceDir(repoDir), join(repoDir, 'workspace'));
    assert.equal(configModule.getAgentDir(repoDir), join(repoDir, 'agent'));
  } finally {
    cleanupTempDir(tempDir);
  }
});

test('loadAgentConfig returns null when config.json is missing or invalid', async () => {
  const tempDir = createTempHome('config-invalid');

  try {
    const repoDir = join(tempDir, 'repo');
    ensureDir(repoDir);

    const configModule = await importFreshModule<typeof import('../src/lib/config.js')>('./lib/config.ts');
    assert.equal(configModule.loadAgentConfig(repoDir), null);

    writeFileSync(join(repoDir, 'config.json'), '{invalid json');
    assert.equal(configModule.loadAgentConfig(repoDir), null);
  } finally {
    cleanupTempDir(tempDir);
  }
});
