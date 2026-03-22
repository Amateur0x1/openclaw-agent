import { execSync } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { AgentConfig } from './store.js';

const OC_HOME = join(homedir(), '.openclaw');
const OC_CONFIG = join(OC_HOME, 'openclaw.json');

export function getOpenclawConfig(): any {
  if (!existsSync(OC_CONFIG)) {
    return null;
  }
  return JSON.parse(readFileSync(OC_CONFIG, 'utf-8'));
}

export function saveOpenclawConfig(config: any): void {
  writeFileSync(OC_CONFIG, JSON.stringify(config, null, 2));
}

// Convert absolute path to ~-prefixed path
function toTildePath(absPath: string): string {
  const home = homedir();
  if (absPath.startsWith(home)) {
    return absPath.replace(home, '~');
  }
  return absPath;
}

export function registerAgent(config: AgentConfig): void {
  const ocConfig = getOpenclawConfig();
  if (!ocConfig) {
    throw new Error('OpenClaw is not initialized. Run openclaw configure first');
  }

  // Ensure agents.list exists
  if (!ocConfig.agents) {
    ocConfig.agents = {};
  }
  if (!ocConfig.agents.list) {
    ocConfig.agents.list = [];
  }

  // Check if already exists
  const existingIndex = ocConfig.agents.list.findIndex((a: any) => a.id === config.id);

  let agentEntry: any = {
    id: config.id,
  };

  if (existingIndex >= 0) {
    // Update: keep old config, only update workspace
    const existingAgent = ocConfig.agents.list[existingIndex];
    agentEntry = { ...existingAgent };

    // Update workspace if provided
    if (config.workspace) {
      agentEntry.workspace = toTildePath(config.workspace);
    } else if (!agentEntry.workspace) {
      // No workspace and none provided, use default
      agentEntry.workspace = `~/.openclaw/workspace-${config.id}`;
    }

    // Update other fields if provided
    if (config.model) agentEntry.model = config.model;
    if (config.subagents) agentEntry.subagents = config.subagents;
    if (config.skills) agentEntry.skills = config.skills;
    if (config.identity) agentEntry.identity = config.identity;

    ocConfig.agents.list[existingIndex] = agentEntry;
  } else {
    // New: use provided config or defaults
    if (config.workspace) {
      agentEntry.workspace = toTildePath(config.workspace);
    } else {
      agentEntry.workspace = `~/.openclaw/workspace-${config.id}`;
    }

    if (config.model) agentEntry.model = config.model;
    if (config.subagents) agentEntry.subagents = config.subagents;
    if (config.skills) agentEntry.skills = config.skills;
    if (config.identity) agentEntry.identity = config.identity;

    ocConfig.agents.list.push(agentEntry);
  }

  saveOpenclawConfig(ocConfig);
}

export function unregisterAgent(agentId: string): void {
  const ocConfig = getOpenclawConfig();
  if (!ocConfig || !ocConfig.agents?.list) {
    return;
  }

  ocConfig.agents.list = ocConfig.agents.list.filter((a: any) => a.id !== agentId);
  saveOpenclawConfig(ocConfig);
}

export function listOpenclawAgents(): string[] {
  const ocConfig = getOpenclawConfig();
  if (!ocConfig || !ocConfig.agents?.list) {
    return [];
  }
  return ocConfig.agents.list.map((a: any) => a.id);
}

export function getAgentWorkspace(agentId: string): string | null {
  const ocConfig = getOpenclawConfig();
  if (!ocConfig || !ocConfig.agents?.list) {
    return null;
  }
  const agent = ocConfig.agents.list.find((a: any) => a.id === agentId);
  return agent?.workspace || null;
}

export function getOpenclawWorkspace(): string {
  return join(OC_HOME, 'workspace');
}
