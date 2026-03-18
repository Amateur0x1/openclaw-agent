import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

export interface AgentConfig {
  id: string;
  workspace?: string;
  model?: {
    primary: string;
  };
  subagents?: {
    allowAgents: string[];
  };
  skills?: string[];
  identity?: {
    name: string;
    avatar?: string;
  };
}

export interface AgentMeta {
  name: string;
  workspace: string;
  gitDir: string;
  agentDir: string;
  config: AgentConfig;
  remote: string | null;
  lastSync: string;
}

export interface AgentsIndex {
  version: string;
  agents: Record<string, AgentMeta>;
}

const AGENTS_DIR = join(homedir(), '.openclaw-agents');
const AGENTS_JSON = join(AGENTS_DIR, 'agents.json');

export function getAgentsDir(): string {
  return AGENTS_DIR;
}

export function getReposDir(): string {
  return join(AGENTS_DIR, 'repos');
}

export function loadAgentsIndex(): AgentsIndex {
  if (!existsSync(AGENTS_JSON)) {
    return { version: '1.0', agents: {} };
  }
  try {
    return JSON.parse(readFileSync(AGENTS_JSON, 'utf-8'));
  } catch {
    return { version: '1.0', agents: {} };
  }
}

export function saveAgentsIndex(index: AgentsIndex): void {
  mkdirSync(AGENTS_DIR, { recursive: true });
  writeFileSync(AGENTS_JSON, JSON.stringify(index, null, 2));
}

export function getAgentMeta(name: string): AgentMeta | null {
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

export function setAgentMeta(name: string, meta: AgentMeta): void {
  const index = loadAgentsIndex();
  index.agents[name] = meta;
  saveAgentsIndex(index);
}

export function removeAgentMeta(name: string): void {
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

export function listAgents(): AgentMeta[] {
  const index = loadAgentsIndex();
  return Object.values(index.agents);
}
