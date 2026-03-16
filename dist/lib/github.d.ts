export interface GitHubRepo {
    name: string;
    fullName: string;
    url: string;
    private: boolean;
}
export declare function isGhInstalled(): boolean;
export declare function isGhAuthenticated(): boolean;
export declare function createGitHubRepo(name: string, description?: string): GitHubRepo;
export declare function getGhUsername(): string;
export declare function listGitHubRepos(): GitHubRepo[];
export declare function cloneGitHubRepo(fullName: string, targetDir: string): void;
export declare function getRepoUrl(fullName: string): string;
export declare function getSshUrl(fullName: string): string;
//# sourceMappingURL=github.d.ts.map