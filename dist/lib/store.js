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
    // 先按 key 搜索
    if (index.agents[name]) {
        return index.agents[name];
    }
    // 再按 config.id 搜索
    for (const key in index.agents) {
        const agent = index.agents[key];
        if (agent.config?.id === name) {
            return agent;
        }
    }
    return null;
}
export function setAgentMeta(name, meta) {
    const index = loadAgentsIndex();
    index.agents[name] = meta;
    saveAgentsIndex(index);
}
export function removeAgentMeta(name) {
    const index = loadAgentsIndex();
    // 先按 key 删除
    if (index.agents[name]) {
        delete index.agents[name];
        saveAgentsIndex(index);
        return;
    }
    // 再按 config.id 查找并删除
    for (const key in index.agents) {
        const agent = index.agents[key];
        if (agent.config?.id === name) {
            delete index.agents[key];
            saveAgentsIndex(index);
            return;
        }
    }
}
export function listAgents() {
    const index = loadAgentsIndex();
    return Object.values(index.agents);
}
//# sourceMappingURL=store.js.map