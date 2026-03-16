import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
const AGENTS_DIR = join(homedir(), '.openclaw-agents');
const AGENTS_JSON = join(AGENTS_DIR, 'agents.json');
export function getAgentsDir() {
    return AGENTS_DIR;
}
export function getReposDir() {
    return join(AGENTS_DIR, 'repos');
}
export function loadAgentsIndex() {
    if (!existsSync(AGENTS_JSON)) {
        return { version: '1.0', agents: {} };
    }
    try {
        return JSON.parse(readFileSync(AGENTS_JSON, 'utf-8'));
    }
    catch {
        return { version: '1.0', agents: {} };
    }
}
export function saveAgentsIndex(index) {
    mkdirSync(AGENTS_DIR, { recursive: true });
    writeFileSync(AGENTS_JSON, JSON.stringify(index, null, 2));
}
export function getAgentMeta(name) {
    const index = loadAgentsIndex();
    return index.agents[name] || null;
}
export function setAgentMeta(name, meta) {
    const index = loadAgentsIndex();
    index.agents[name] = meta;
    saveAgentsIndex(index);
}
export function removeAgentMeta(name) {
    const index = loadAgentsIndex();
    delete index.agents[name];
    saveAgentsIndex(index);
}
export function listAgents() {
    const index = loadAgentsIndex();
    return Object.values(index.agents);
}
//# sourceMappingURL=store.js.map