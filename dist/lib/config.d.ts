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
export declare function loadAgentConfig(repoDir: string): AgentConfigJson | null;
export declare function getWorkspaceDir(repoDir: string): string;
export declare function getAgentDir(repoDir: string): string;
//# sourceMappingURL=config.d.ts.map