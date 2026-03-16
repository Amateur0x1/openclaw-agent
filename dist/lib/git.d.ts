import { SimpleGit } from 'simple-git';
export declare function openGitRepo(path: string): SimpleGit;
export declare function gitAdd(git: SimpleGit, files: string[]): void;
export declare function gitCommit(git: SimpleGit, message: string): void;
export declare function gitPush(git: SimpleGit, remote?: string, branch?: string): void;
export declare function gitPull(git: SimpleGit, remote?: string, branch?: string): void;
export declare function gitLog(git: SimpleGit, maxCount?: number): void;
export declare function gitRemoteAdd(git: SimpleGit, name: string, url: string): void;
export declare function hasRemote(git: SimpleGit, name?: string): boolean;
export declare function syncToOpenclaw(gitDir: string, agentId: string): void;
export declare function syncFromOpenclaw(gitDir: string, agentId: string): void;
//# sourceMappingURL=git.d.ts.map