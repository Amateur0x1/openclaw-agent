import { execSync } from 'child_process';
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
        throw new Error('gh CLI 未安装');
    }
    // 使用 gh repo create
    try {
        execSync(`gh repo create ${name} --private --source=. --push`, {
            stdio: 'inherit',
            cwd: process.cwd()
        });
    }
    catch (e) {
        // 如果已经存在，尝试获取
        console.log('仓库可能已存在，尝试获取信息...');
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
        throw new Error('无法获取 GitHub 用户名，请先运行 gh auth login');
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
        throw new Error('gh CLI 未安装');
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