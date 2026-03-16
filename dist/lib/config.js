import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
export function loadAgentConfig(repoDir) {
    const configPath = join(repoDir, 'config.json');
    if (!existsSync(configPath)) {
        return null;
    }
    try {
        return JSON.parse(readFileSync(configPath, 'utf-8'));
    }
    catch {
        return null;
    }
}
export function getWorkspaceDir(repoDir) {
    return join(repoDir, 'workspace');
}
export function getAgentDir(repoDir) {
    return join(repoDir, 'agent');
}
//# sourceMappingURL=config.js.map