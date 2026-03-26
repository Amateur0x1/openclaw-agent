import { execFileSync, execSync } from 'child_process';
export function isGhInstalled() {
    try {
        execSync('gh --version', { stdio: 'ignore' });
        return true;
    }
    catch {
        return false;
    }
}
export function isGhAuthenticated() {
    try {
        execSync('gh auth status', { stdio: 'ignore' });
        return true;
    }
    catch {
        return false;
    }
}
export function createGitHubRepo(name, description) {
    if (!isGhInstalled()) {
        throw new Error('gh CLI is not installed');
    }
    try {
        const args = ['repo', 'create', name, '--private'];
        if (description) {
            args.push('--description', description);
        }
        execFileSync('gh', args, {
            stdio: 'inherit',
            cwd: process.cwd()
        });
    }
    catch (e) {
        const stderr = `${e?.stderr || ''}`;
        const stdout = `${e?.stdout || ''}`;
        const message = `${e?.message || ''}\n${stdout}\n${stderr}`;
        if (message.includes('already exists') ||
            message.includes('name already exists') ||
            message.includes('has already been taken')) {
            return {
                name,
                fullName: `${getGhUsername()}/${name}`,
                url: `https://github.com/${getGhUsername()}/${name}`,
                private: true
            };
        }
        throw new Error(`Failed to create GitHub repo "${name}": ${message.trim()}`);
    }
    return {
        name,
        fullName: `${getGhUsername()}/${name}`,
        url: `https://github.com/${getGhUsername()}/${name}`,
        private: true
    };
}
export function getGhUsername() {
    try {
        return execSync('gh api user --jq ".login"', { encoding: 'utf-8' }).trim();
    }
    catch {
        throw new Error('Unable to get GitHub username. Run gh auth login first');
    }
}
export function listGitHubRepos() {
    if (!isGhInstalled()) {
        return [];
    }
    try {
        const output = execSync('gh repo list --limit 100', { encoding: 'utf-8' });
        const lines = output.trim().split('\n');
        return lines.map(line => {
            const parts = line.split('\t');
            const fullName = parts[0];
            const [owner, name] = fullName.split('/');
            const description = parts[2] || '';
            return {
                name,
                fullName,
                url: `https://github.com/${fullName}`,
                private: line.includes('private')
            };
        });
    }
    catch {
        return [];
    }
}
export function cloneGitHubRepo(fullName, targetDir) {
    if (!isGhInstalled()) {
        throw new Error('gh CLI is not installed');
    }
    execSync(`gh repo clone ${fullName} "${targetDir}"`, { stdio: 'inherit' });
}
export function getRepoUrl(fullName) {
    return `https://github.com/${fullName}.git`;
}
export function getSshUrl(fullName) {
    return `git@github.com:${fullName}.git`;
}
//# sourceMappingURL=github.js.map