import { AgentConfig } from './store.js';
export declare function getOpenclawConfig(): any;
export declare function getOpenclawAgent(agentId: string): any | null;
export interface ResolvedSkillEntry {
    name: string;
    path: string;
}
export declare function resolveDeclaredSkills(agentId: string, workspacePath?: string): ResolvedSkillEntry[];
export declare function saveOpenclawConfig(config: any): void;
export declare function registerAgent(config: AgentConfig): void;
export declare function unregisterAgent(agentId: string): void;
export declare function listOpenclawAgents(): string[];
export declare function getAgentWorkspace(agentId: string): string | null;
export declare function getOpenclawWorkspace(): string;
//# sourceMappingURL=openclaw.d.ts.map