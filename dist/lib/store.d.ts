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
export declare function getAgentsDir(): string;
export declare function getReposDir(): string;
export declare function loadAgentsIndex(): AgentsIndex;
export declare function saveAgentsIndex(index: AgentsIndex): void;
export declare function getAgentMeta(name: string): AgentMeta | null;
export declare function setAgentMeta(name: string, meta: AgentMeta): void;
export declare function removeAgentMeta(name: string): void;
export declare function listAgents(): AgentMeta[];
//# sourceMappingURL=store.d.ts.map