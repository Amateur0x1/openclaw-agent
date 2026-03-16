import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface AgentConfigJson {
  id: string;
  model?: {
    primary: string;
  };
  subagents?: {
    allowAgents: string[];
  };
  skills?: string[];
}

export function loadAgentConfig(repoDir: string): AgentConfigJson | null {
  const configPath = join(repoDir, 'config.json');
  if (!existsSync(configPath)) {
    return null;
  }
  
  try {
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch {
    return null;
  }
}

export function getWorkspaceDir(repoDir: string): string {
  return join(repoDir, 'workspace');
}

export function getAgentDir(repoDir: string): string {
  return join(repoDir, 'agent');
}
